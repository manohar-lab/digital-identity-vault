import React,{useState} from "react";
import {
BrowserRouter,
Routes,
Route
} from "react-router-dom";

const API="http://127.0.0.1:8000";


/* ---------------- OPEN WINDOWS ---------------- */

function launchAll(){

window.open("http://localhost:5173/user","userWindow");
window.open("http://localhost:5173/admin","adminWindow");
window.open("http://localhost:5173/bank","bankWindow");
window.open("http://localhost:5173/consent","consentWindow");
window.open("http://localhost:5173/vault","vaultWindow");

}



/* ---------------- DASHBOARD ---------------- */

function Dashboard(){

return(

<div style={{
minHeight:"100vh",
padding:"40px",
background:
"linear-gradient(135deg,#020617,#1e3a8a,#0ea5e9)",
color:"white",
fontFamily:"Segoe UI"
}}>

<h1 style={{fontSize:"56px"}}>
🔐 Digital Identity Vault
</h1>

<p>Privacy Preserving Verification Network</p>

<button
onClick={launchAll}
style={{
padding:"18px 28px",
borderRadius:"18px",
border:"none",
fontWeight:"700"
}}
>
Launch All Portals
</button>


<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:"25px",
marginTop:"40px"
}}>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"24px"
}}>
<h2>KYC Requests</h2>
<h1>126</h1>
</div>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"24px"
}}>
<h2>Fraud Risk</h2>
<h1>82%</h1>
</div>

<div style={{
background:"rgba(255,255,255,.08)",
padding:"30px",
borderRadius:"24px"
}}>
<h2>Consent Rate</h2>
<h1>91%</h1>
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
padding:"40px",
background:"#1d4ed8",
color:"white"
}}>

<h1>🪪 User Wallet</h1>

<input
type="file"
onChange={(e)=>
setFile(e.target.files[0])
}
/>

<br/><br/>

<button onClick={upload}>
Upload Aadhaar
</button>

{result &&(

<div style={{
marginTop:"40px",
padding:"30px",
background:"rgba(255,255,255,.1)",
borderRadius:"20px"
}}>

<h2>Credential Stored</h2>

<p>
Name:
{result.extracted.name}
</p>

<p>
Age:
{String(result.extracted.age_over_18)}
</p>

<p>
Address:
{String(result.extracted.address_verified)}
</p>

</div>

)}

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
padding:"50px",
background:"#14532d",
color:"white"
}}>

<h1>🏛 Government Portal</h1>

<button onClick={approve}>
Approve Signature
</button>

{approved &&
<h2>
✔ Credential Approved
</h2>
}

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
padding:"50px",
background:"#312e81",
color:"white"
}}>

<h1>🏦 Bank Portal</h1>

<button onClick={requestProof}>
Request Proof
</button>

{req &&(

<div>

<p>
Request ID:
{req.request_id}
</p>

<p>
OTP:
{req.approval_code}
</p>

</div>

)}

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
padding:"50px",
background:"#fff7ed"
}}>

<h1>🛡 Consent Portal</h1>

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
<h2>
Approved
</h2>
}

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
padding:"50px",
background:"#020617",
color:"#22d3ee"
}}>

<h1>🔒 Vault Monitor</h1>

<input
placeholder="Request ID"
onChange={(e)=>
setId(e.target.value)
}
/>

<button onClick={fetchProof}>
Fetch
</button>

{proof &&

<pre>
{JSON.stringify(
proof,
null,
2
)}
</pre>

}

</div>

)

}



/* ---------------- ROUTER ---------------- */

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