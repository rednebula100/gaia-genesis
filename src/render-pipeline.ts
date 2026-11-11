import * as THREE from 'three';
import {AerialPerspectiveEffect,PrecomputedTexturesLoader} from '@takram/three-atmosphere';
import {Ellipsoid} from '@takram/three-geospatial';
import {EffectComposer,RenderPass,EffectPass,ToneMappingEffect,ToneMappingMode,BloomEffect} from 'postprocessing';
import {CloudVolumePass} from './cloud-volume';

export function createPipeline(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,sun:THREE.Vector3){
 // All scene shaders emit linear radiance. Only the final EffectPass tone maps
 // and encodes sRGB. No gamma approximation or renderer tone mapping is applied upstream.
 renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 // Multisampled half-float depth resolves stall Intel's WebGL driver. The
 // sampled cloud/atmosphere silhouette already has continuous optical coverage.
 const composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType,multisampling:0});
 const clouds=new CloudVolumePass(camera);clouds.volume.uniforms.uSun.value.copy(sun);
 const atmosphere=new AerialPerspectiveEffect(camera,{ellipsoid:new Ellipsoid(6360000,6360000,6360000),correctAltitude:false,correctGeometricError:false,sky:true,sun:false,moon:false,ground:false,sunLight:false,skyLight:false});
 atmosphere.sunDirection.copy(sun);atmosphere.blendMode.opacity.value=0;
 const bloom=new BloomEffect({intensity:.055,luminanceThreshold:2.2,luminanceSmoothing:.4,mipmapBlur:true});
 const tone=new ToneMappingEffect({mode:ToneMappingMode.AGX});
 composer.addPass(new RenderPass(scene,camera));composer.addPass(clouds);
 composer.addPass(new EffectPass(camera,atmosphere));composer.addPass(new EffectPass(camera,bloom,tone));
 // Checked-in MIT LUT assets avoid costly and nondeterministic per-device precomputation.
 const ready=new PrecomputedTexturesLoader().loadAsync(`${import.meta.env.BASE_URL}atmosphere/`).then(textures=>{Object.assign(atmosphere,textures);});
 return {composer,clouds,atmosphere,ready};
}
