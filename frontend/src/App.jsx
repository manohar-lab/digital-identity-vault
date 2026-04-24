import { useState } from "react";

export default function App() {

const API="http://127.0.0.1:8000";

const [userId,setUserId]=useState("u1");
const [requestId,setRequestId]=useState("");
const [code,setCode]=useState("");
const [response,setResponse]=useState("");


// ------------------
// Upload document
// ------------------

async function uploadDoc(){

const res=await fetch(`${API}/upload_document`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user_id:userId,
doc_type:"aadhaar",
age_over_18:true,
has_pan:true,
address_verified:true
})
});

const data=await res.json();

setResponse(
JSON.stringify(data)
);

}



// ------------------
// Admin approve
// ------------------

async function adminApprove(){

const res=await fetch(`${API}/admin/approve`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user_id:userId,
officer_id:"gov01"
})
});

const data=await res.json();

setResponse(
JSON.stringify(data)
);

}



// ------------------
// Bank request
// ------------------

async function requestVerify(){

const res=await fetch(`${API}/request_verification`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user_id:userId,
attribute:"age_over_18",
bank:"ABC Bank",
phone:"+911234567890"
})
});

const data=await res.json();

setRequestId(
data.request_id
);

setResponse(
JSON.stringify(data)
);

}



// ------------------
// User consent
// ------------------

async function approveConsent(){

const res=await fetch(`${API}/approve_request`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
request_id:requestId,
code:code
})
});

const data=await res.json();

setResponse(
JSON.stringify(data)
);

}



// ------------------
// Vault response
// ------------------

async function getVaultResult(){

const res=await fetch(
`${API}/vault_response/${requestId}`
);

const data=await res.json();

setResponse(
JSON.stringify(data)
);

}



return(

<div style={{padding:"40px"}}>

<h1>Digital Identity Vault</h1>

<hr/>

<h2>1. User Upload</h2>

<button onClick={uploadDoc}>
Upload Aadhaar
</button>


<hr/>

<h2>2. Govt Admin</h2>

<button onClick={adminApprove}>
Approve Document
</button>


<hr/>

<h2>3. Bank Portal</h2>

<button onClick={requestVerify}>
Request Verification
</button>

<p>
Request ID:
<b>{requestId}</b>
</p>


<hr/>

<h2>4. User Consent</h2>

<input
placeholder="Enter SMS code"
value={code}
onChange={(e)=>
setCode(e.target.value)
}
/>

<button onClick={approveConsent}>
Approve
</button>


<hr/>

<h2>5. Vault Response</h2>

<button onClick={getVaultResult}>
Check Result
</button>


<hr/>

<h2>Status</h2>

<pre>{response}</pre>

</div>

)

}