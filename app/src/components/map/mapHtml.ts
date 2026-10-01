/**
 * A free, Google-Maps-style street map: MapLibre GL + OpenFreeMap vector tiles (OpenStreetMap data).
 * No API key, no billing. Runs inside a WebView (iOS/Android) or an iframe (web).
 *
 * Messages in  : window.agape.update(state)  or  postMessage(state)
 * Messages out : {type:"ready"} · {type:"center", lat, lng} (pick mode) · {type:"tap", id}
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl";

export function mapHtml(initial: { lat: number; lng: number; zoom?: number }) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}.css">
<script src="${MAPLIBRE}.js"></script>
<style>
  html,body,#map{margin:0;height:100%;width:100%;background:#F2EFE9;overflow:hidden;font-family:Roboto,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-tap-highlight-color:transparent}
  .maplibregl-ctrl-attrib{font-size:10px!important;background:rgba(255,255,255,.75)!important}
  .maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right{bottom:var(--pb,0px)}
  .maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{top:var(--pt,0px)}
  /* markers */
  .you{width:18px;height:18px;border-radius:50%;background:#1A73E8;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);position:relative}
  .you:before{content:"";position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(26,115,232,.18);animation:halo 2.4s ease-out infinite}
  @keyframes halo{0%{transform:scale(.35);opacity:1}100%{transform:scale(1);opacity:0}}
  .pickup{width:16px;height:16px;border-radius:50%;background:#fff;border:5px solid #188038;box-shadow:0 1px 4px rgba(0,0,0,.35)}
  .church{display:flex;align-items:flex-end;gap:4px;pointer-events:auto}
  .church svg{filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
  .church b{font-size:13px;font-weight:700;color:#C5361B;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 4px #fff;white-space:nowrap;margin-bottom:22px}
  .car{width:44px;height:44px;transition:transform .9s linear}
  .car svg{filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
  .person{display:flex;flex-direction:column;align-items:center}
  .person i{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:#fff;font:700 14px/1 Roboto,Helvetica,Arial,sans-serif;font-style:normal;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .person s{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #fff;margin-top:-1px;filter:drop-shadow(0 2px 1px rgba(0,0,0,.2))}
  .person em{font:600 11px/1.2 Roboto,Helvetica,Arial,sans-serif;font-style:normal;color:#3C4043;background:#fff;border-radius:8px;padding:2px 6px;margin-top:3px;box-shadow:0 1px 3px rgba(0,0,0,.2);white-space:nowrap}
  /* drag-the-map pickup pin */
  #pick{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);pointer-events:none;display:none;flex-direction:column;align-items:center;z-index:5}
  #pick .tag{background:#202124;color:#fff;font:600 12px/1 Roboto,Helvetica,Arial,sans-serif;padding:7px 11px;border-radius:14px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
  #pick .stick{width:3px;height:16px;background:#202124;border-radius:2px}
  #pick .head{width:22px;height:22px;border-radius:50%;background:#188038;border:4px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);margin-bottom:-2px}
  #pick .shadow{width:10px;height:4px;border-radius:50%;background:rgba(0,0,0,.3);margin-top:1px;transition:transform .2s}
  #pick.lift .head,#pick.lift .tag,#pick.lift .stick{transform:translateY(-10px)}
  #pick .head,#pick .tag,#pick .stick{transition:transform .2s}
  #pick.lift .shadow{transform:scale(1.6)}
</style></head><body><div id="map"></div><div id="pick"><span class="tag">Pickup here</span><span class="head"></span><span class="stick"></span><span class="shadow"></span></div>
<script>
(function(){
  var post=function(m){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m));else parent.postMessage(Object.assign({agapeMap:1},m),"*")}catch(e){}};
  if(!window.maplibregl){document.body.innerHTML='<div style="display:grid;place-items:center;height:100%;color:#5f6368;font:14px sans-serif">Map needs an internet connection</div>';return;}
  var map=new maplibregl.Map({container:"map",style:"${MAP_STYLE_URL}",center:[${initial.lng},${initial.lat}],zoom:${initial.zoom ?? 13},attributionControl:false,pitchWithRotate:false,dragRotate:false,fadeDuration:0});
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-left");

  /* --- make OpenStreetMap look like Google Maps --- */
  function set(id,k,v){try{map.setPaintProperty(id,k,v)}catch(e){}}
  function lay(id,k,v){try{map.setLayoutProperty(id,k,v)}catch(e){}}
  function googleify(){
    var layers=map.getStyle().layers||[];
    layers.forEach(function(l){
      var id=l.id, sl=l["source-layer"]||"", t=l.type, low=id.toLowerCase();
      if(t==="background") return set(id,"background-color","#F5F3EF");
      if(sl==="water"&&t==="fill") return set(id,"fill-color","#9DC4F5");
      if(sl==="waterway"&&t==="line") return set(id,"line-color","#9DC4F5");
      if((sl==="park"||sl==="landcover")&&t==="fill"){
        if(/sand|beach/.test(low)) return set(id,"fill-color","#F6EDCF");
        if(/ice|glacier/.test(low)) return set(id,"fill-color","#F4F8FB");
        set(id,"fill-color","#CBE8C2"); return set(id,"fill-opacity",0.9);
      }
      if(sl==="landuse"&&t==="fill"){
        if(/hospital/.test(low)) return set(id,"fill-color","#F9E3E3");
        if(/school|university|college/.test(low)) return set(id,"fill-color","#EDEBF5");
        if(/cemetery|grass|park|pitch|stadium/.test(low)) return set(id,"fill-color","#D3ECCB");
        return set(id,"fill-color","#EFEDE8");
      }
      if(sl==="aeroway"&&t==="fill") return set(id,"fill-color","#E6E4EA");
      if(sl==="building"){
        if(t==="fill"){set(id,"fill-color","#E8E5E0");return set(id,"fill-outline-color","#D8D4CE");}
        if(t==="fill-extrusion"){set(id,"fill-extrusion-color","#E4E1DB");return set(id,"fill-extrusion-opacity",0.75);}
      }
      if(sl==="transportation"&&t==="line"){
        if(/rail|transit|ferry|cable|aerialway/.test(low)) return;
        var casing=/casing|outline/.test(low), hw=/motorway|trunk/.test(low), major=/primary|secondary|tertiary/.test(low), path=/path|pedestrian|footway|cycle|track/.test(low);
        if(path) return set(id,"line-color","#E2DED7");
        if(casing) return set(id,"line-color",hw?"#E3A62F":major?"#D6D2CB":"#DFDBD5");
        return set(id,"line-color",hw?"#FBD36B":major?"#FFFFFF":"#FFFFFF");
      }
      if(t==="symbol"){
        var place=sl==="place", water=/water|ocean|sea|lake|river|marine/.test(low), road=sl==="transportation_name", poi=sl==="poi";
        set(id,"text-color",water?"#3E76C6":road?"#5F6368":poi?"#6B6F76":place?"#3C4043":"#5F6368");
        set(id,"text-halo-color","rgba(255,255,255,0.95)");set(id,"text-halo-width",1.6);
      }
    });
  }
  map.on("load",function(){googleify();ready=true;post({type:"ready"});flush();});
  map.on("error",function(e){if(!ready&&e&&e.error&&/style/i.test(String(e.error.message||"")))post({type:"error",message:String(e.error.message)});});

  /* --- state --- */
  var ready=false, pending=null, markers={}, last={fitKey:null,centerKey:null}, routeAdded=false, pickEl=document.getElementById("pick");
  function el(m){
    var d=document.createElement("div");
    if(m.kind==="you"){d.className="you";}
    else if(m.kind==="pickup"){d.className="pickup";}
    else if(m.kind==="church"){d.className="church";d.innerHTML='<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.6 0 14.8 0 25.9 15 40 15 40s15-14.1 15-25.2C30 6.6 23.3 0 15 0z" fill="#EA4335"/><path d="M15 0C6.7 0 0 6.6 0 14.8 0 25.9 15 40 15 40s15-14.1 15-25.2C30 6.6 23.3 0 15 0z" fill="url(#g)" opacity=".25"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><path d="M13.6 7h2.8v4.2h4.1V14h-4.1v8.4h-2.8V14H9.5v-2.8h4.1z" fill="#fff"/></svg><b></b>';d.querySelector("b").textContent=m.label||"";}
    else if(m.kind==="car"){d.className="car";d.innerHTML='<svg width="44" height="44" viewBox="0 0 44 44"><g transform="translate(22 22)"><rect x="-8.5" y="-17" width="17" height="34" rx="7" fill="#fff" stroke="rgba(0,0,0,.18)"/><rect x="-6.5" y="-9.5" width="13" height="7" rx="2.2" fill="#2E3A46"/><rect x="-6" y="7.5" width="12" height="4.5" rx="1.8" fill="#2E3A46"/><rect x="-7" y="-1.5" width="14" height="8" rx="1.5" fill="#F1F3F4"/><rect x="-7.5" y="-16" width="4" height="2.2" rx="1" fill="#FFE08A"/><rect x="3.5" y="-16" width="4" height="2.2" rx="1" fill="#FFE08A"/></g></svg>';}
    else {d.className="person";d.innerHTML='<i></i><s></s>'+(m.label?'<em></em>':"");d.querySelector("i").textContent=(m.letter||"?").slice(0,1).toUpperCase();d.querySelector("i").style.background=m.color||"#1A73E8";if(m.label)d.querySelector("em").textContent=m.label;}
    d.addEventListener("click",function(ev){ev.stopPropagation();post({type:"tap",id:m.id});});
    return d;
  }
  var anchors={you:"center",pickup:"center",car:"center",church:"bottom-left",person:"bottom"};
  function animateTo(rec,lng,lat){
    var from=rec.marker.getLngLat(), t0=performance.now(), dur=900;
    cancelAnimationFrame(rec.raf);
    (function step(now){var k=Math.min(1,(now-t0)/dur);rec.marker.setLngLat([from.lng+(lng-from.lng)*k,from.lat+(lat-from.lat)*k]);if(k<1)rec.raf=requestAnimationFrame(step);})(t0);
  }
  function bearing(a,b){var y=Math.sin((b.lng-a.lng)*Math.PI/180)*Math.cos(b.lat*Math.PI/180),x=Math.cos(a.lat*Math.PI/180)*Math.sin(b.lat*Math.PI/180)-Math.sin(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.cos((b.lng-a.lng)*Math.PI/180);return Math.atan2(y,x)*180/Math.PI;}
  function setMarkers(list){
    var seen={};
    (list||[]).forEach(function(m){
      seen[m.id]=1;
      var rec=markers[m.id];
      if(rec&&rec.kind!==m.kind){rec.marker.remove();rec=null;}
      if(!rec){
        var e=el(m);
        rec=markers[m.id]={kind:m.kind,el:e,marker:new maplibregl.Marker({element:e,anchor:anchors[m.kind]||"center",rotationAlignment:m.kind==="car"?"map":"viewport"}).setLngLat([m.lng,m.lat]).addTo(map)};
      } else {
        var p=rec.marker.getLngLat();
        if(Math.abs(p.lng-m.lng)>1e-7||Math.abs(p.lat-m.lat)>1e-7){
          if(m.kind==="car"&&m.heading==null) m.heading=bearing(p,{lng:m.lng,lat:m.lat});
          if(m.kind==="car"||m.kind==="you") animateTo(rec,m.lng,m.lat); else rec.marker.setLngLat([m.lng,m.lat]);
        }
        if(m.kind==="church"){var b=rec.el.querySelector("b");if(b&&b.textContent!==(m.label||""))b.textContent=m.label||"";}
      }
      if(m.kind==="car"&&m.heading!=null) rec.marker.setRotation(m.heading);
    });
    Object.keys(markers).forEach(function(id){if(!seen[id]){markers[id].marker.remove();delete markers[id];}});
  }
  function setRoute(r){
    var data={type:"FeatureCollection",features:r&&r.coords&&r.coords.length>1?[{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:r.coords}}]:[]};
    if(!routeAdded){
      map.addSource("route",{type:"geojson",data:data});
      var before=(map.getStyle().layers.find(function(l){return l.type==="symbol"})||{}).id;
      map.addLayer({id:"route-casing",type:"line",source:"route",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#1558C0","line-width":["interpolate",["linear"],["zoom"],10,5,16,11]}},before);
      map.addLayer({id:"route-line",type:"line",source:"route",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#4285F4","line-width":["interpolate",["linear"],["zoom"],10,3,16,8]}},before);
      routeAdded=true;
    } else map.getSource("route").setData(data);
    var dashed=!!(r&&r.dashed);
    set("route-line","line-dasharray",dashed?[0.6,1.6]:[1,0]);
    set("route-casing","line-opacity",dashed?0:1);
    set("route-line","line-color",(r&&r.color)||"#4285F4");
  }
  function applyPadding(p){
    p=p||{};
    var pad={top:p.top||0,bottom:p.bottom||0,left:p.left||0,right:p.right||0};
    map.setPadding(pad);
    document.body.style.setProperty("--pb",pad.bottom+"px");document.body.style.setProperty("--pt",pad.top+"px");
    pickEl.style.left=(pad.left+(innerWidth-pad.left-pad.right)/2)+"px";
    pickEl.style.top=(pad.top+(innerHeight-pad.top-pad.bottom)/2)+"px";
    return pad;
  }
  function flush(){
    if(!ready||!pending)return;
    var s=pending;pending=null;last.state=s;
    var pad=applyPadding(s.padding);
    setMarkers(s.markers);
    setRoute(s.route);
    pickEl.style.display=s.pick?"flex":"none";
    if(s.center&&s.centerKey!==last.centerKey){last.centerKey=s.centerKey;map.easeTo({center:[s.center.lng,s.center.lat],zoom:s.center.zoom||map.getZoom(),duration:last.centerKey?800:0});}
    if(s.fit&&s.fit.length&&s.fitKey!==last.fitKey){
      last.fitKey=s.fitKey;
      if(s.fit.length===1) map.easeTo({center:[s.fit[0].lng,s.fit[0].lat],zoom:15,duration:800});
      else{var b=new maplibregl.LngLatBounds();s.fit.forEach(function(p){b.extend([p.lng,p.lat]);});map.fitBounds(b,{padding:{top:pad.top+50,bottom:pad.bottom+50,left:pad.left+50,right:pad.right+50},maxZoom:16,duration:900});}
    }
    if(s.follow&&markers[s.follow]){var ll=markers[s.follow].marker.getLngLat(),pt=map.project(ll);if(pt.x<pad.left+30||pt.x>innerWidth-pad.right-30||pt.y<pad.top+30||pt.y>innerHeight-pad.bottom-30)map.easeTo({center:ll,duration:800});}
  }
  map.on("movestart",function(){pickEl.classList.add("lift");});
  map.on("moveend",function(){pickEl.classList.remove("lift");if(pickEl.style.display!=="none"){var c=map.getCenter();post({type:"center",lat:c.lat,lng:c.lng});}});
  window.agape={update:function(s){pending=s;flush();}};
  window.addEventListener("message",function(e){var d=e.data;if(typeof d==="string"){try{d=JSON.parse(d)}catch(x){return}}if(d&&d.agapeState)window.agape.update(d.agapeState);});
  addEventListener("resize",function(){if(last.state)applyPadding(last.state.padding);});
})();
</script></body></html>`;
}
