// Developer-only optical benchmark. Never fetched or sampled by a generated world.
// NASA/GSFC, Reto Stöckli and Robert Simmon. See THIRD_PARTY_NOTICES.md.
export async function earthReference(){
 const pixels=async(name:string)=>{
  const image=new Image();image.src=`${import.meta.env.BASE_URL}reference/${name}`;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0,2048,1024);return new Uint8Array(context.getImageData(0,0,2048,1024).data);
 };
 const [biome,cloud]=await Promise.all([pixels('land_ocean_ice_2048.jpg'),pixels('cloud_combined_2048.jpg')]);
 const terrain=new Uint8Array(biome.length);
 for(let i=0;i<biome.length;i+=4){
  const ocean=biome[i+2]>biome[i]*1.18&&biome[i+2]>biome[i+1]*.98;
  const h=Math.round((ocean?.32:.54)*65535);terrain[i]=h>>8;terrain[i+1]=h&255;terrain[i+2]=0;terrain[i+3]=128;
  cloud[i]=Math.min(255,cloud[i]*1.1);cloud[i+1]=128;cloud[i+2]=0;cloud[i+3]=255;
 }
 return {terrain,biome,cloud,sea:.46};
}
