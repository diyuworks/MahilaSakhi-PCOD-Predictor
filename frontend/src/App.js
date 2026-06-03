import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
Chart as ChartJS,
BarElement,
CategoryScale,
LinearScale,
Tooltip,
Legend
} from "chart.js";

ChartJS.register(
BarElement,
CategoryScale,
LinearScale,
Tooltip,
Legend
);

function App(){

const [age,setAge]=useState("");
const [weight,setWeight]=useState("");
const [bmi,setBmi]=useState("");
const [fsh,setFsh]=useState("");

const [weightGain,setWeightGain]=useState(0);
const [cycleIrregular,setCycleIrregular]=useState(0);
const [hairGrowth,setHairGrowth]=useState(0);
const [pimples,setPimples]=useState(0);
const [skinDarkening,setSkinDarkening]=useState(0);
const [exercise,setExercise]=useState(0);

const [result,setResult]=useState("");

const [chat,setChat]=useState([]);
const [message,setMessage]=useState("");

const predictPCOD = async ()=>{

try{

const features=[
Number(age),
Number(weight),
Number(bmi),
Number(weightGain),
Number(cycleIrregular),
Number(hairGrowth),
Number(pimples),
Number(skinDarkening),
Number(fsh),
Number(exercise)
];

const response = await fetch("https://mahilasakhi-pcod-predictor-8.onrender.com/predict",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({features})
});

const data = await response.json();

setResult(data.prediction || "No prediction");

}catch(error){

console.error(error);
setResult("Server error");

}

};

const chartData={
labels:[
"Age","Weight","BMI","Weight Gain",
"Cycle","Hair Growth","Pimples",
"Skin Dark","FSH","Exercise"
],
datasets:[{
label:"Health Indicators",
data:[
age,weight,bmi,weightGain,
cycleIrregular,hairGrowth,
pimples,skinDarkening,fsh,exercise
],
backgroundColor:"#ff6b81"
}]
};

const getRecommendations=()=>{

let tips=[];

if(bmi>25)
tips.push("Maintain healthy BMI with balanced diet and exercise.");

if(weightGain===1)
tips.push("Reduce sugar intake and monitor weight.");

if(cycleIrregular===1)
tips.push("Maintain consistent sleep schedule.");

if(hairGrowth===1 || pimples===1)
tips.push("Possible hormonal imbalance detected.");

if(skinDarkening===1)
tips.push("Possible insulin resistance.");

if(exercise===0)
tips.push("Start daily exercise such as yoga or walking.");

if(tips.length===0)
tips.push("Your indicators look healthy. Maintain balanced lifestyle.");

return tips;

};

const getDietPlan=()=>{

return[
"Breakfast: Oats with fruits",
"Lunch: Roti with vegetables and dal",
"Snack: Yogurt with nuts",
"Dinner: Light salad with protein"
];

};

const getBotReply=(msg)=>{

msg=msg.toLowerCase();

if(msg.includes("diet"))
return "For PCOD focus on high fiber foods, vegetables and reduce sugar.";

if(msg.includes("exercise"))
return "Daily walking, yoga and strength training help regulate hormones.";

if(msg.includes("acne"))
return "PCOD acne occurs due to hormonal imbalance.";

return "Maintain healthy diet, exercise and consult doctor if symptoms persist.";

};

const sendMessage=()=>{

if(!message) return;

const userMsg={sender:"user",text:message};

const botMsg={
sender:"bot",
text:getBotReply(message)
};

setChat([...chat,userMsg,botMsg]);
setMessage("");

};

const yesNo=(label,value,setValue)=>(

<div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>

<p style={{width:"150px",fontSize:"14px"}}>{label}</p>

<button
onClick={()=>setValue(1)}
style={{
background:value===1?"#ff6b81":"#eee",
border:"none",
padding:"5px 14px",
borderRadius:"18px",
fontWeight:"bold",
cursor:"pointer",
fontSize:"13px"
}}
>
Yes
</button>

<button
onClick={()=>setValue(0)}
style={{
background:value===0?"#ff6b81":"#eee",
border:"none",
padding:"5px 14px",
borderRadius:"18px",
fontWeight:"bold",
cursor:"pointer",
fontSize:"13px"
}}
>
No
</button>

</div>

);

return(

<div style={{
fontFamily:"Arial",
minHeight:"100vh",
background:"linear-gradient(135deg,#fff0f3,#ffe4e9)"
}}>

{/* Navbar */}

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"12px 35px",
background:"white",
boxShadow:"0 2px 6px rgba(0,0,0,0.05)"
}}>

<h2 style={{color:"#ff6b81"}}>🌸 MahilaSakhi</h2>

<div style={{display:"flex",gap:"18px",color:"#555",fontSize:"14px"}}>

<p style={{cursor:"pointer"}} onClick={()=>document.getElementById("dashboard").scrollIntoView({behavior:"smooth"})}>Dashboard</p>

<p style={{cursor:"pointer"}} onClick={()=>document.getElementById("ai-health").scrollIntoView({behavior:"smooth"})}>AI Health</p>

<p style={{cursor:"pointer"}} onClick={()=>document.getElementById("about").scrollIntoView({behavior:"smooth"})}>About</p>

</div>

</div>

{/* Main Card */}

<div
id="dashboard"
style={{
maxWidth:"1100px",
margin:"10px auto",
background:"white",
borderRadius:"16px",
padding:"18px",
boxShadow:"0 10px 20px rgba(0,0,0,0.1)"
}}
>

<h1 style={{
textAlign:"center",
fontSize:"30px",
background:"linear-gradient(90deg,#ff6b81,#ff9aa2)",
WebkitBackgroundClip:"text",
WebkitTextFillColor:"transparent"
}}>
AI PCOD Risk Analyzer
</h1>

<p style={{
textAlign:"center",
color:"#666",
marginBottom:"12px",
fontSize:"14px"
}}>
Personalized Women's Health Assistant
</p>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"20px"
}}>

{/* LEFT */}

<div>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:"10px"
}}>

<input placeholder="Age" value={age} onChange={(e)=>setAge(e.target.value)} style={inputStyle}/>
<input placeholder="Weight" value={weight} onChange={(e)=>setWeight(e.target.value)} style={inputStyle}/>
<input placeholder="BMI" value={bmi} onChange={(e)=>setBmi(e.target.value)} style={inputStyle}/>
<input placeholder="FSH Level" value={fsh} onChange={(e)=>setFsh(e.target.value)} style={inputStyle}/>

</div>

<br/>

{yesNo("Weight Gain",weightGain,setWeightGain)}
{yesNo("Cycle Irregular",cycleIrregular,setCycleIrregular)}
{yesNo("Hair Growth",hairGrowth,setHairGrowth)}
{yesNo("Pimples",pimples,setPimples)}
{yesNo("Skin Darkening",skinDarkening,setSkinDarkening)}
{yesNo("Exercise Regularly",exercise,setExercise)}

<br/>

<button
onClick={predictPCOD}
style={{
background:"linear-gradient(90deg,#ff6b81,#ff9aa2)",
color:"white",
border:"none",
padding:"10px 26px",
borderRadius:"22px",
fontWeight:"bold",
cursor:"pointer",
fontSize:"14px"
}}
>
Predict PCOD Risk
</button>

{result &&(

<div style={{marginTop:"10px"}}>

<h2 style={{color:result.includes("High")?"#d60000":"green",fontSize:"18px"}}>
{result}
</h2>

<h3 style={{fontSize:"15px"}}>AI Health Recommendations</h3>

<ul style={{fontSize:"13px"}}>
{getRecommendations().map((tip,index)=>(
<li key={index}>{tip}</li>
))}
</ul>

{result.includes("High") &&(

<div>

<h3 style={{fontSize:"15px"}}>Recommended Diet Plan</h3>

<ul style={{fontSize:"13px"}}>
{getDietPlan().map((meal,index)=>(
<li key={index}>{meal}</li>
))}
</ul>

</div>

)}

</div>

)}

</div>

{/* RIGHT */}

<div>

<div style={{
background:"white",
borderRadius:"12px",
padding:"10px",
boxShadow:"0 3px 10px rgba(0,0,0,0.08)"
}}>

<h3 style={{textAlign:"center",fontSize:"16px"}}>Health Indicators Chart</h3>

<div style={{height:"180px"}}>
<Bar data={chartData} options={{responsive:true,maintainAspectRatio:false}}/>
</div>

<p style={{textAlign:"center",color:"#777",fontSize:"12px"}}>
Your health indicators visualization
</p>

</div>

{/* Chatbot */}

<div
id="ai-health"
style={{
marginTop:"10px",
background:"#ffffff",
borderRadius:"12px",
boxShadow:"0 4px 8px rgba(0,0,0,0.1)",
padding:"10px"
}}
>

<h3 style={{fontSize:"15px"}}>💬 PCOD Health Assistant</h3>

<div style={{
height:"110px",
overflowY:"auto",
background:"#fafafa",
borderRadius:"10px",
padding:"8px",
marginBottom:"6px",
display:"flex",
flexDirection:"column",
gap:"6px"
}}>

{chat.map((c,i)=>(
<div
key={i}
style={{
alignSelf:c.sender==="user"?"flex-end":"flex-start",
background:c.sender==="user"?"#ff6b81":"#eee",
color:c.sender==="user"?"white":"black",
padding:"6px 10px",
borderRadius:"12px",
maxWidth:"70%",
fontSize:"12px"
}}
>
{c.text}
</div>
))}

</div>

<div style={{display:"flex",gap:"6px"}}>

<input
placeholder="Ask about PCOD..."
value={message}
onChange={(e)=>setMessage(e.target.value)}
style={{
flex:1,
padding:"6px",
borderRadius:"8px",
border:"1px solid #ddd",
fontSize:"12px"
}}
/>

<button
onClick={sendMessage}
style={{
background:"#ff6b81",
color:"white",
border:"none",
padding:"6px 12px",
borderRadius:"8px",
fontSize:"12px"
}}
>
Send
</button>

</div>

</div>

</div>

</div>

</div>

{/* About */}

<div
id="about"
style={{
maxWidth:"900px",
margin:"20px auto",
textAlign:"center",
color:"#666",
fontSize:"13px"
}}
>

<h2>About MahilaSakhi</h2>

<p>
MahilaSakhi is an AI-powered women's health assistant that predicts
PCOD risk using machine learning and provides personalized health
recommendations including diet guidance and an AI chatbot.
</p>

</div>

</div>

);

}

const inputStyle={
width:"100%",
padding:"8px",
borderRadius:"8px",
border:"1px solid #ddd",
fontSize:"13px"
};

export default App;