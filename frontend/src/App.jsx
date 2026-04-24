import { useState } from "react";
import {
Routes,
Route,
Link
} from "react-router-dom";

const API="http://127.0.0.1:8000";

function Layout({children}){

function launchAll(){
window.open("/user");
window.open("/admin");
window.open("/bank");
window.open("/consent");
window.open("/vault");
}

return(
<div style={{
background:"#0f172a",
minHeight:"100vh",
padding:"30px",
color:"white",
fontFamily:"Arial"
}}>

<div style={{
maxWidth:"900px",
margin:"auto"
}}>

<h1>Digital Identity Vault</h1>

<button
onClick={launchAll}
style={{
padding:"12px 20px",
borderRadius:"10px",
border:"none",
background:"#2563eb",
color:"white"
}}
>
Launch All Portals
</button>

<hr/>

<div style={{marginBottom:"30px"}}>
<Link to="/user">User</Link> |{" "}
<Link to="/admin">Admin</Link> |{" "}
<Link to="/bank">Bank</Link> |{" "}
<Link to="/consent">Consent</Link> |{" "}
<Link to="/vault">Vault</Link>
</div>

{children}

</div>
</div>
)
}



/* USER PORTAL */
function UserPortal(){

const [file,setFile]=useState(null);
const [msg,setMsg]=useState("");

async function uploadImage(){

if(!file){
alert("Choose image first");
return;
}

const formData=new FormData();

/* only send file */
formData.append(
"file",
file
);

/* FIXED: user_id goes in query */
const res=await fetch(
`${API}/upload_aadhaar?user_id=u1`,
{
method:"POST",
body:formData
}
);

const data=await res.json();

setMsg(
JSON.stringify(
data,
null,
2
)
);

}

return(
<Layout>

<div style={{
background:"#1e293b",
padding:"30px",
borderRadius:"16px"
}}>

<h2>User Vault App</h2>

<p>Upload Aadhaar Image</p>

<input
type="file"
accept="image/*"
onChange={(e)=>
setFile(
e.target.files[0]
)}
/>

<br/><br/>

<button onClick={uploadImage}>
Upload Aadhaar
</button>

<pre>{msg}</pre>

</div>

</Layout>
)
}



/* ADMIN */
function AdminPortal(){

const [msg,setMsg]=useState("");

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
officer_id:"gov01"
})
}
);

const data=await res.json();

setMsg(
JSON.stringify(
data,
null,
2
)
);

}

return(
<Layout>

<div style={{
background:"#1e293b",
padding:"30px",
borderRadius:"16px"
}}>

<h2>Govt Admin Portal</h2>

<button onClick={approve}>
Approve Document
</button>

<pre>{msg}</pre>

</div>

</Layout>
)
}



/* BANK */
function BankPortal(){

const [bankResult,setBankResult]=useState(null);

async function requestVerification(){

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
phone:"+911234567890"
})
}
);

const data=await res.json();

setBankResult(data);

}

return(
<Layout>

<div style={{
background:"#1e293b",
padding:"30px",
borderRadius:"16px"
}}>

<h2>Bank Portal</h2>

<button onClick={requestVerification}>
Request Verification
</button>

{bankResult && (
<div style={{marginTop:"20px"}}>

<p>
Request ID:
<b>{bankResult.request_id}</b>
</p>

<p>
Approval Code:
<b>{bankResult.approval_code}</b>
</p>

<pre>
{JSON.stringify(
bankResult,
null,
2
)}
</pre>

</div>
)}

</div>

</Layout>
)
}



/* CONSENT */
function ConsentPortal(){

const [requestId,setRequestId]=useState("");
const [code,setCode]=useState("");
const [msg,setMsg]=useState("");

async function approveConsent(){

const res=await fetch(
`${API}/approve_request`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
request_id:requestId,
code:code
})
}
);

const data=await res.json();

setMsg(
JSON.stringify(
data,
null,
2
)
);

}

return(
<Layout>

<div style={{
background:"#1e293b",
padding:"30px",
borderRadius:"16px"
}}>

<h2>User Consent Portal</h2>

<input
placeholder="Request ID"
value={requestId}
onChange={(e)=>
setRequestId(
e.target.value
)}
/>

<br/><br/>

<input
placeholder="Approval Code"
value={code}
onChange={(e)=>
setCode(
e.target.value
)}
/>

<button onClick={approveConsent}>
Approve Consent
</button>

<pre>{msg}</pre>

</div>

</Layout>
)
}



/* VAULT */
function VaultPortal(){

const [requestId,setRequestId]=useState("");
const [result,setResult]=useState("");

async function checkVault(){

const res=await fetch(
`${API}/vault_response/${requestId}`
);

const data=await res.json();

setResult(
JSON.stringify(
data,
null,
2
)
);

}

return(
<Layout>

<div style={{
background:"#1e293b",
padding:"30px",
borderRadius:"16px"
}}>

<h2>Vault Response Portal</h2>

<input
placeholder="Request ID"
value={requestId}
onChange={(e)=>
setRequestId(
e.target.value
)}
/>

<button onClick={checkVault}>
Check Result
</button>

<pre>{result}</pre>

</div>

</Layout>
)
}



export default function App(){

return(
<Routes>

<Route path="/" element={<UserPortal/>}/>
<Route path="/user" element={<UserPortal/>}/>
<Route path="/admin" element={<AdminPortal/>}/>
<Route path="/bank" element={<BankPortal/>}/>
<Route path="/consent" element={<ConsentPortal/>}/>
<Route path="/vault" element={<VaultPortal/>}/>

</Routes>
)
}