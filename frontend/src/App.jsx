import React,{useState} from "react";
import {
BrowserRouter,
Routes,
Route
} from "react-router-dom";

const API="http://127.0.0.1:8000";


function launchAll(){

window.open("http://localhost:5173/user","userWindow");
window.open("http://localhost:5173/admin","adminWindow");
window.open("http://localhost:5173/bank","bankWindow");
window.open("http://localhost:5173/consent","consentWindow");
window.open("http://localhost:5173/vault","vaultWindow");

}



/* ---------------- HOME ---------------- */

function Dashboard(){

return(

<div style={{
minHeight:"100vh",
padding:"50px",
background:
"linear-gradient(135deg,#020617,#1e3a8a,#0ea5e9)",
color:"white",
fontFamily:"Segoe UI"
}}>

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center"
}}>

<div>
<h1 style={{
fontSize:"58px",
margin:0
}}>
🔐 Digital Identity Vault
</h1>

<p style={{
opacity:.8,
fontSize:"20px"
}}>
Privacy Preserving Credential Network
</p>

</div>

<button
onClick={launchAll}
style={{
padding:"18px 34px",
borderRadius:"18px",
border:"none",
fontWeight:"700"
}}
>
Launch All Portals
</button>

</div>



<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"28px",
marginTop:"50px"
}}>

{["126 KYC Requests","82% Fraud Score","91% Consent"].map(item=>(

<div
key={item}
style={{
background:"rgba(255,255,255,.08)",
padding:"35px",
borderRadius:"28px"
}}
>
<h2>{item}</h2>
</div>

))}

</div>



<div style={{
marginTop:"35px",
background:"rgba(255,255,255,.08)",
padding:"35px",
borderRadius:"30px"
}}>

<h2>Verification Trend</h2>

<div style={{
display:"flex",
height:"240px",
alignItems:"end",
gap:"14px",
marginTop:"30px"
}}>

{[60,90,120,110,150,180,160].map((h,i)=>(

<div
key={i}
style={{
flex:1,
height:h,
background:"white",
borderRadius:"20px 20px 0 0"
}}
/>

))}

</div>

</div>

</div>

)

}



/* ---------------- USER ---------------- */

function UserPortal(){

const [file,setFile]=useState(null);
const [result,setResult]=useState(null);

async function upload(){

if(!file){
alert("Choose file");
return;
}

const fd=new FormData();

fd.append("file",file);

const res=await fetch(
`${API}/upload_aadhaar?user_id=u1`,
{
method:"POST",
body:fd
}
);

const data=await res.json();

setResult(data);

}

return(

<div style={{
minHeight:"100vh",
background:
"linear-gradient(135deg,#020617,#1d4ed8,#38bdf8)",
padding:"50px",
color:"white"
}}>

<h1 style={{fontSize:"52px"}}>
🪪 Identity Wallet
</h1>


<div style={{
display:"grid",
gridTemplateColumns:"1.3fr 1fr",
gap:"30px",
marginTop:"40px"
}}>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"40px",
borderRadius:"30px"
}}>

<h2>Upload Aadhaar</h2>

<input
type="file"
onChange={(e)=>
setFile(e.target.files[0])
}
/>

<br/><br/>

<button onClick={upload}>
Upload & Verify
</button>

</div>


<div style={{
background:"rgba(255,255,255,.08)",
padding:"40px",
borderRadius:"30px"
}}>

<h2>Credential Status</h2>

{result &&(
<>
<h3>
👤 {result.extracted.name}
</h3>

<p>
Age:
{String(result.extracted.age_over_18)}
</p>

<p>
Address:
{String(result.extracted.address_verified)}
</p>
</>
)}

</div>

</div>

</div>

)

}



/* ---------------- ADMIN ---------------- */

function AdminPortal(){

const [approved,setApproved]=useState(false);

async function approve(){

const res=await fetch(
`${API}/admin/approve`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user_id:"u1",
officer_id:"gov001"
})
}
);

const data=await res.json();

if(data.status==="verified"){
setApproved(true);
}

}

return(

<div style={{
minHeight:"100vh",
background:
"linear-gradient(135deg,#052e16,#16a34a)",
padding:"50px",
color:"white"
}}>

<h1 style={{fontSize:"50px"}}>
🏛 Government Verification Console
</h1>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"30px",
marginTop:"40px"
}}>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"35px",
borderRadius:"30px"
}}>

<h2>Pending Credential</h2>

<button onClick={approve}>
Approve Signature
</button>

{approved &&
<h3>
✔ Approved
</h3>
}

</div>


<div style={{
background:"rgba(255,255,255,.08)",
padding:"35px",
borderRadius:"30px"
}}>
<h2>Approval Queue</h2>
<h1>12</h1>
</div>

</div>

</div>

)

}



/* ---------------- BANK ---------------- */

function BankPortal(){

const [req,setReq]=useState(null);

async function requestProof(){

const res=await fetch(
`${API}/request_verification`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user_id:"u1",
attribute:"age_over_18",
bank:"ABC Bank",
phone:"+919999999999"
})
}
);

const data=await res.json();

setReq(data);

}

return(

<div style={{
minHeight:"100vh",
background:
"linear-gradient(135deg,#1e1b4b,#4f46e5)",
padding:"50px",
color:"white"
}}>

<h1 style={{fontSize:"50px"}}>
🏦 Bank Risk Dashboard
</h1>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"30px",
marginTop:"40px"
}}>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"28px"
}}>

<button onClick={requestProof}>
Request Proof
</button>

{req &&(
<>
<p>
ID:
{req.request_id}
</p>

<p>
OTP:
{req.approval_code}
</p>
</>
)}

</div>


<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"28px"
}}>
<h2>Fraud Score</h2>
<h1>82%</h1>
</div>


<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"28px"
}}>
<h2>Verification Trend</h2>

<div style={{
display:"flex",
height:"150px",
alignItems:"end",
gap:"10px"
}}>

{[50,90,120,100,140].map((h,i)=>(

<div
key={i}
style={{
flex:1,
height:h,
background:"white"
}}
/>

))}

</div>

</div>

</div>

</div>

)

}



/* ---------------- CONSENT ---------------- */

function ConsentPortal(){

const [id,setId]=useState("");
const [otp,setOtp]=useState("");
const [ok,setOk]=useState(false);

async function approve(){

const res=await fetch(
`${API}/approve_request`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
request_id:id,
code:otp
})
}
);

const data=await res.json();

if(data.approved){
setOk(true);
}

}

return(

<div style={{
minHeight:"100vh",
background:
"linear-gradient(135deg,#fff7ed,#fed7aa)",
padding:"70px"
}}>

<div style={{
maxWidth:"500px",
margin:"auto",
background:"white",
padding:"45px",
borderRadius:"35px"
}}>

<h1>🛡 Consent Approval</h1>

<input
placeholder="Request ID"
onChange={(e)=>
setId(e.target.value)
}
/>

<br/><br/>

<input
placeholder="OTP"
onChange={(e)=>
setOtp(e.target.value)
}
/>

<br/><br/>

<button onClick={approve}>
Approve
</button>

{ok &&
<h3>
Approved
</h3>
}

</div>

</div>

)

}



/* ---------------- VAULT ---------------- */

function VaultPortal(){

const [id,setId]=useState("");
const [proof,setProof]=useState(null);

async function fetchProof(){

const res=await fetch(
`${API}/vault_response/${id}`
);

const data=await res.json();

setProof(data);

}

return(

<div style={{
minHeight:"100vh",
background:"#020617",
padding:"50px",
color:"#22d3ee",
fontFamily:"monospace"
}}>

<h1 style={{fontSize:"50px"}}>
🔒 Security Vault Monitor
</h1>

<input
placeholder="Request ID"
onChange={(e)=>
setId(e.target.value)
}
/>

<button onClick={fetchProof}>
Generate Proof
</button>

{proof &&(

<div style={{
marginTop:"40px",
padding:"30px",
border:"1px solid #22d3ee"
}}>

<pre>
{JSON.stringify(
proof,
null,
2
)}
</pre>

</div>

)}

</div>

)

}



/* ---------------- ROUTES ---------------- */

export default function App(){

return(

<BrowserRouter>

<Routes>

<Route
path="/"
element={<Dashboard/>}
/>

<Route
path="/user"
element={<UserPortal/>}
/>

<Route
path="/admin"
element={<AdminPortal/>}
/>

<Route
path="/bank"
element={<BankPortal/>}
/>

<Route
path="/consent"
element={<ConsentPortal/>}
/>

<Route
path="/vault"
element={<VaultPortal/>}
/>

</Routes>

</BrowserRouter>

)

}