import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../lib/auth/session";
import { supabaseRest } from "../../../lib/supabase/rest";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({error:"Sign in again."},{status:401});
  const store=await cookies();
  const token=store.get("ss_access_token")?.value;
  if(!token) return NextResponse.json({error:"Sign in again."},{status:401});
  const body=await request.json().catch(()=>({}));
  const name=typeof body?.name==="string"?body.name.trim():"";
  const domainRaw=typeof body?.domain==="string"?body.domain.trim():"";
  const market=typeof body?.market==="string"?body.market.trim():"";
  const category=typeof body?.category==="string"?body.category.trim():"";
  if(name.length<2||domainRaw.length<3) return NextResponse.json({error:"Business name and website are required."},{status:400});
  let domain="";
  try{
    const value=/^https?:\/\//i.test(domainRaw)?domainRaw:`https://${domainRaw}`;
    domain=new URL(value).hostname.toLowerCase().replace(/^www\./,"");
  }catch{return NextResponse.json({error:"Enter a valid website address."},{status:400});}

  const membership=await supabaseRest("/rest/v1/organization_members?select=organization_id&user_id=eq."+encodeURIComponent(user.id)+"&limit=1",{method:"GET"},token);
  const orgId=membership.ok?(await membership.json())?.[0]?.organization_id:null;
  if(!orgId) return NextResponse.json({error:"Workspace not found."},{status:404});

  const exists=await supabaseRest("/rest/v1/projects?select=id&id=eq."+encodeURIComponent("")+"%26organization_id=eq."+encodeURIComponent(orgId),{method:"GET"},token);
  void exists;

  const response=await supabaseRest("/rest/v1/projects",{
    method:"POST",
    headers:{Prefer:"return=representation"},
    body:JSON.stringify({
      organization_id:orgId,
      name,
      domain,
      market:market||null,
      category:category||null,
      status:"active",
      created_by:user.id
    })
  },token);
  const data=await response.json().catch(()=>[]);
  if(!response.ok) return NextResponse.json({error:data?.message||"Could not create website."},{status:response.status});
  return NextResponse.json({ok:true,project:Array.isArray(data)?data[0]:data});
}