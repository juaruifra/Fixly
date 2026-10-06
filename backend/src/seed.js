import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { Service } from "./models/service.model.js";
const sampleServices=[
{name:"Montaje de muebles",category:"Montaje",price:35,duration:60,description:"Montaje de muebles, estanterías y pequeños elementos del hogar.",active:true},
{name:"Instalación de lámparas",category:"Electricidad",price:30,duration:45,description:"Instalación o sustitución de lámparas y plafones de techo.",active:true},
{name:"Reparación de grifos",category:"Fontanería",price:40,duration:60,description:"Reparación de fugas sencillas y sustitución de grifos domésticos.",active:true},
{name:"Colgar TV en pared",category:"Instalación",price:55,duration:75,description:"Instalación de soporte y montaje de televisor en pared.",active:true},
{name:"Pequeños trabajos de pintura",category:"Pintura",price:65,duration:120,description:"Retoques de pintura y reparación de pequeñas zonas interiores.",active:true}
];
try{await connectDB();await Service.deleteMany({});const created=await Service.insertMany(sampleServices);console.log(`Seed completado: ${created.length} servicios insertados.`);}catch(e){console.error("Error al ejecutar el seed:",e);process.exitCode=1;}finally{await mongoose.disconnect();}
