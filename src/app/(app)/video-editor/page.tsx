"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Clip { id: string; startTime: number; endTime: number; label: string; color: string; }
interface Caption { id: string; startTime: number; endTime: number; text: string; style: string; }
interface MusicTrack { id: string; name: string; mood: string; url: string; volume: number; }

const CLIP_COLORS = ["#6c5ce7","#00d4ff","#00e5a0","#ff8c42","#ff4757","#ffd43b"];
const CAP_STYLES = ["bold","neon","boxed","yellow","word"];
function fmtTime(s: number) { const m=Math.floor(s/60); const sec=Math.floor(s%60); const ms=Math.floor((s%1)*10); return `${m}:${sec.toString().padStart(2,"0")}.${ms}`; }

export default function VideoEditorPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [duration, setDuration] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [clips, setClips] = useState<Clip[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [music, setMusic] = useState<MusicTrack|null>(null);
  const [selectedClip, setSelectedClip] = useState<string|null>(null);
  const [selectedCaption, setSelectedCaption] = useState<string|null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);
  const [musicTracks, setMusicTracks] = useState<{id:string;name:string;mood:string;url:string}[]>([]);
  const [activeTab, setActiveTab] = useState<"clips"|"captions"|"music"|"export">("clips");
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const PX_PER_SEC = 60 * zoom;

  useEffect(() => { fetch("/api/music").then(r=>r.json()).then(d=>{ if(d.tracks) setMusicTracks(d.tracks); }).catch(()=>{}); }, []);
  useEffect(() => { const vid=videoRef.current; if(vid&&!playing&&Math.abs(vid.currentTime-currentTime)>0.1) vid.currentTime=currentTime; }, [currentTime,playing]);

  const startPlay = useCallback(() => {
    const vid=videoRef.current; if(!vid||!videoLoaded){toast.info("Load a video first");return;}
    vid.play().catch(()=>{});setPlaying(true);
    const tick=()=>{ if(!videoRef.current)return; const t=videoRef.current.currentTime; setCurrentTime(t); if(t>=trimEnd){vid.pause();vid.currentTime=trimStart;setPlaying(false);return;} rafRef.current=requestAnimationFrame(tick); };
    rafRef.current=requestAnimationFrame(tick);
  }, [videoLoaded,trimEnd,trimStart]);

  const stopPlay = useCallback(() => { const vid=videoRef.current; if(vid)vid.pause(); cancelAnimationFrame(rafRef.current); setPlaying(false); }, []);

  const loadVideo = (url: string) => {
    const vid=videoRef.current; if(!vid)return;
    vid.src=url; vid.load();
    vid.onloadedmetadata=()=>{ const d=vid.duration; setDuration(d);setTrimEnd(d);setCurrentTime(0); setClips([{id:"c1",startTime:0,endTime:d,label:"Main Clip",color:CLIP_COLORS[0]}]); setVideoLoaded(true); toast.success("Video loaded! 🎬"); };
  };

  const handleTimelineClick=(e: React.MouseEvent)=>{ const rect=timelineRef.current?.getBoundingClientRect(); if(!rect)return; const x=e.clientX-rect.left; const t=Math.max(0,Math.min(duration,x/PX_PER_SEC)); setCurrentTime(t); if(videoRef.current)videoRef.current.currentTime=t; };

  const splitAtPlayhead=()=>{ if(!selectedClip){toast.error("Select a clip first");return;} const clip=clips.find(c=>c.id===selectedClip); if(!clip)return; if(currentTime<=clip.startTime||currentTime>=clip.endTime){toast.error("Playhead must be inside clip");return;} const newClip:Clip={...clip,id:`c${Date.now()}`,startTime:currentTime,label:clip.label+" (2)"}; setClips(cs=>cs.map(c=>c.id===selectedClip?{...c,endTime:currentTime}:c).concat(newClip)); toast.success("Split!"); };

  const addCaption=()=>{ const c:Caption={id:`cap${Date.now()}`,startTime:currentTime,endTime:currentTime+3,text:"New caption",style:"bold"}; setCaptions(cs=>[...cs,c]);setSelectedCaption(c.id);setActiveTab("captions"); };

  const addMusic=(t:{id:string;name:string;mood:string;url:string})=>{ setMusic({...t,volume:0.4}); toast.success(`🎵 ${t.name} added`); };

  const exportTimeline=()=>{
    if(!videoLoaded){ toast.error("Load a video first"); return; }
    // Extract videoId from loaded URL
    const vidId = videoUrl.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];
    if(vidId) {
      const a=document.createElement("a");
      a.href=`/api/clip?videoId=${vidId}&start=${trimStart}&duration=${trimEnd-trimStart}&mode=download&vertical=true`;
      a.download=`viralcut-${vidId}-${Math.round(trimStart)}s.mp4`;
      a.click();
      toast.success("Server clip download started! 📥");
    } else {
      // Client-side canvas export via MediaRecorder
      const vid=videoRef.current;
      if(!vid){ toast.error("No video loaded"); return; }
      const canvas=document.createElement("canvas");
      canvas.width=360; canvas.height=640;
      const ctx=canvas.getContext("2d");
      if(!ctx){ toast.error("Canvas not supported"); return; }
      const mimeType=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";
      const stream=canvas.captureStream(30);
      const recorder=new MediaRecorder(stream,{mimeType});
      const chunks: Blob[]=[];
      recorder.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); };
      recorder.onstop=()=>{
        const blob=new Blob(chunks,{type:"video/webm"});
        const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
        a.download=`viralcut-edit-${Math.round(trimStart)}s.webm`; a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Export complete! ✅");
      };
      vid.currentTime=trimStart; vid.play().catch(()=>{});
      recorder.start();
      const drawInterval=setInterval(()=>{
        if(!videoRef.current||videoRef.current.currentTime>=trimEnd){ clearInterval(drawInterval); recorder.stop(); vid.pause(); return; }
        ctx.drawImage(vid,0,0,canvas.width,canvas.height);
      }, 33);
      toast.info("Exporting timeline...");
    }
  };

  const timelinePx=duration*PX_PER_SEC;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 60px)",background:"var(--bg)",overflow:"hidden"}}>
      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"10px 20px",borderBottom:"1px solid var(--border)",background:"var(--bg-1)",flexShrink:0}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:16}}>🎬 Video Editor <span className="badge badge-green" style={{fontSize:9,verticalAlign:"middle"}}>LIVE</span></div>
        <div style={{flex:1,display:"flex",gap:8,alignItems:"center"}}>
          <input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Paste video URL or /api/ytproxy?videoId=..." style={{flex:1,fontSize:12,padding:"7px 12px"}} onKeyDown={e=>e.key==="Enter"&&loadVideo(videoUrl)} />
          <button className="btn btn-primary btn-sm" onClick={()=>loadVideo(videoUrl)} disabled={!videoUrl.trim()}>Load</button>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--text-4)"}}>Zoom</span>
          <input type="range" min={0.5} max={4} step={0.25} value={zoom} onChange={e=>setZoom(+e.target.value)} style={{width:70,accentColor:"var(--brand)"}} />
          <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-3)"}}>{zoom}x</span>
        </div>
        <button className="btn btn-success btn-sm" onClick={exportTimeline} disabled={!videoLoaded}>📤 Export</button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Left Preview */}
        <div style={{width:280,flexShrink:0,background:"var(--bg-1)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",padding:14,gap:12}}>
          <div style={{aspectRatio:"9/16",background:"#000",borderRadius:10,overflow:"hidden",position:"relative",border:"1px solid var(--border-2)"}}>
            <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover"}} />
            {!videoLoaded&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}><div style={{fontSize:32}}>🎬</div><div style={{fontSize:11,color:"var(--text-4)"}}>Load a video URL above</div></div>}
            {captions.filter(c=>currentTime>=c.startTime&&currentTime<=c.endTime).map(cap=>(
              <div key={cap.id} style={{position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",padding:cap.style==="boxed"?"4px 10px":0,background:cap.style==="boxed"?"rgba(0,0,0,0.8)":"transparent",borderRadius:4,whiteSpace:"nowrap"}}>
                <span style={{fontSize:13,fontWeight:900,fontFamily:"var(--font-display)",color:cap.style==="yellow"?"#ffd43b":cap.style==="neon"?"#67e8f9":"#fff",textShadow:cap.style==="neon"?"0 0 12px rgba(103,232,249,0.8)":"2px 2px 4px rgba(0,0,0,0.9)"}}>{cap.text}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{stopPlay();setCurrentTime(Math.max(trimStart,currentTime-5));}}>⏮</button>
            <button className="btn btn-primary" style={{width:40,height:40,padding:0,justifyContent:"center",borderRadius:"50%"}} onClick={()=>playing?stopPlay():startPlay()}>{playing?"⏸":"▶"}</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentTime(Math.min(trimEnd,currentTime+5))}>⏭</button>
          </div>
          <div style={{textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)"}}>{fmtTime(currentTime)} / {fmtTime(duration)}</div>
          <div style={{background:"var(--bg-2)",borderRadius:"var(--radius-sm)",padding:"10px 12px",border:"1px solid var(--border)"}}>
            <div style={{fontSize:10,color:"var(--text-4)",fontFamily:"var(--mono)",marginBottom:5}}>TRIM RANGE</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:"var(--green)"}}>{fmtTime(trimStart)}</span>
              <span style={{color:"var(--text-4)"}}>→</span>
              <span style={{color:"var(--orange)"}}>{fmtTime(trimEnd)}</span>
              <span style={{color:"var(--brand)"}}>{fmtTime(trimEnd-trimStart)}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <button className="btn btn-outline btn-sm" style={{justifyContent:"center"}} onClick={()=>setTrimStart(currentTime)}>🟢 Set In Point</button>
            <button className="btn btn-outline btn-sm" style={{justifyContent:"center"}} onClick={()=>setTrimEnd(currentTime)}>🔴 Set Out Point</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:"center"}} onClick={splitAtPlayhead}>✂️ Split at Playhead</button>
            <button className="btn btn-ghost btn-sm" style={{justifyContent:"center"}} onClick={addCaption}>💬 Add Caption</button>
          </div>
        </div>

        {/* Right Timeline + Inspector */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Timeline */}
          <div style={{flex:1,overflowX:"auto",overflowY:"auto",background:"var(--bg)"}}>
            <div style={{minWidth:timelinePx+140}}>
              {/* Ruler */}
              <div style={{position:"sticky",top:0,height:28,background:"var(--bg-1)",borderBottom:"1px solid var(--border)",zIndex:10,display:"flex",alignItems:"flex-end",paddingBottom:4}}>
                <div style={{width:120,flexShrink:0,borderRight:"1px solid var(--border)",height:"100%",display:"flex",alignItems:"center",paddingLeft:12}}><span style={{fontSize:10,color:"var(--text-4)",fontFamily:"var(--mono)"}}>TRACKS</span></div>
                <div style={{position:"relative",width:timelinePx,height:"100%"}} ref={timelineRef} onClick={handleTimelineClick}>
                  {Array.from({length:Math.ceil(duration)+1},(_,i)=>i).filter(s=>s%5===0).map(sec=>(
                    <div key={sec} style={{position:"absolute",left:sec*PX_PER_SEC,top:0,bottom:0,borderLeft:"1px solid var(--border)"}}>
                      <span style={{fontSize:9,color:"var(--text-4)",fontFamily:"var(--mono)",paddingLeft:3,whiteSpace:"nowrap"}}>{fmtTime(sec)}</span>
                    </div>
                  ))}
                  <div style={{position:"absolute",top:0,bottom:0,left:currentTime*PX_PER_SEC,width:2,background:"var(--brand)",zIndex:20,pointerEvents:"none"}} />
                </div>
              </div>

              {/* Video track */}
              <div style={{display:"flex",borderBottom:"1px solid var(--border)",height:52}}>
                <div style={{width:120,flexShrink:0,borderRight:"1px solid var(--border)",padding:"8px 12px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12}}>🎬</span><span style={{fontSize:11,color:"var(--text-3)",fontWeight:600}}>Video</span>
                </div>
                <div style={{position:"relative",width:timelinePx,height:52}} onClick={handleTimelineClick}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:trimStart*PX_PER_SEC,background:"rgba(0,0,0,0.5)",zIndex:2}} />
                  <div style={{position:"absolute",right:0,top:0,bottom:0,width:(duration-trimEnd)*PX_PER_SEC,background:"rgba(0,0,0,0.5)",zIndex:2}} />
                  <div style={{position:"absolute",left:trimStart*PX_PER_SEC-3,top:0,bottom:0,width:6,background:"var(--green)",cursor:"col-resize",zIndex:3,borderRadius:"3px 0 0 3px"}} onMouseDown={()=>{}} />
                  <div style={{position:"absolute",left:trimEnd*PX_PER_SEC-3,top:0,bottom:0,width:6,background:"var(--orange)",cursor:"col-resize",zIndex:3}} onMouseDown={()=>{}} />
                  {clips.map(clip=>(
                    <div key={clip.id} style={{position:"absolute",left:clip.startTime*PX_PER_SEC,width:(clip.endTime-clip.startTime)*PX_PER_SEC,top:5,bottom:5,background:`${clip.color}22`,border:`2px solid ${selectedClip===clip.id?clip.color:clip.color+"55"}`,borderRadius:4,cursor:"pointer",overflow:"hidden",display:"flex",alignItems:"center",paddingLeft:6}} onClick={e=>{e.stopPropagation();setSelectedClip(clip.id);}}>
                      <span style={{fontSize:10,color:clip.color,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{clip.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Captions track */}
              <div style={{display:"flex",borderBottom:"1px solid var(--border)",height:40}}>
                <div style={{width:120,flexShrink:0,borderRight:"1px solid var(--border)",padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12}}>💬</span><span style={{fontSize:11,color:"var(--text-3)",fontWeight:600}}>Captions</span>
                </div>
                <div style={{position:"relative",width:timelinePx,height:40}} onClick={handleTimelineClick}>
                  {captions.map(cap=>(
                    <div key={cap.id} style={{position:"absolute",left:cap.startTime*PX_PER_SEC,width:(cap.endTime-cap.startTime)*PX_PER_SEC,top:4,bottom:4,background:"rgba(0,212,255,0.15)",border:`1.5px solid ${selectedCaption===cap.id?"var(--cyan)":"rgba(0,212,255,0.35)"}`,borderRadius:3,cursor:"pointer",paddingLeft:4,display:"flex",alignItems:"center",overflow:"hidden"}} onClick={e=>{e.stopPropagation();setSelectedCaption(cap.id);setActiveTab("captions");}}>
                      <span style={{fontSize:9,color:"var(--cyan)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cap.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Music track */}
              <div style={{display:"flex",height:36}}>
                <div style={{width:120,flexShrink:0,borderRight:"1px solid var(--border)",padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12}}>🎵</span><span style={{fontSize:11,color:"var(--text-3)",fontWeight:600}}>Music</span>
                </div>
                <div style={{position:"relative",width:timelinePx,height:36}}>
                  {music&&<div style={{position:"absolute",left:0,width:timelinePx,top:4,bottom:4,background:"rgba(108,92,231,0.15)",border:"1.5px solid rgba(108,92,231,0.4)",borderRadius:3,paddingLeft:6,display:"flex",alignItems:"center"}}><span style={{fontSize:9,color:"var(--brand)"}}>♪ {music.name}</span></div>}
                </div>
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div style={{height:190,borderTop:"1px solid var(--border)",background:"var(--bg-1)",flexShrink:0}}>
            <div style={{display:"flex",borderBottom:"1px solid var(--border)",padding:"0 12px"}}>
              {(["clips","captions","music","export"] as const).map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)} style={{padding:"7px 14px",borderTop:"none",borderLeft:"none",borderRight:"none",background:"none",cursor:"pointer",fontFamily:"var(--font)",fontSize:12,fontWeight:600,color:activeTab===t?"var(--text)":"var(--text-3)",borderBottom:`2px solid ${activeTab===t?"var(--brand)":"transparent"}`}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
            <div style={{padding:"10px 14px",overflowY:"auto",height:148}}>
              {activeTab==="clips"&&(
                <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
                  {clips.length===0&&<div style={{color:"var(--text-4)",fontSize:12}}>Load a video to see clips</div>}
                  {clips.map(clip=>(
                    <div key={clip.id} style={{background:"var(--bg-2)",border:`1.5px solid ${selectedClip===clip.id?clip.color:"var(--border)"}`,borderRadius:"var(--radius-sm)",padding:"8px 12px",cursor:"pointer",minWidth:140}} onClick={()=>setSelectedClip(clip.id)}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <div style={{width:8,height:8,borderRadius:2,background:clip.color}} />
                        <span style={{fontSize:11,fontWeight:600}}>{clip.label}</span>
                        <button className="btn btn-danger btn-xs" style={{marginLeft:"auto",padding:"1px 5px"}} onClick={e=>{e.stopPropagation();setClips(cs=>cs.filter(c=>c.id!==clip.id));if(selectedClip===clip.id)setSelectedClip(null);}}>✕</button>
                      </div>
                      <div style={{fontSize:9,color:"var(--text-4)",fontFamily:"var(--mono)"}}>{fmtTime(clip.startTime)} → {fmtTime(clip.endTime)}</div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-xs" onClick={()=>setClips(cs=>[...cs,{id:`c${Date.now()}`,startTime:trimStart,endTime:trimEnd,label:`Clip ${cs.length+1}`,color:CLIP_COLORS[cs.length%CLIP_COLORS.length]}])}>+ Add Clip</button>
                </div>
              )}
              {activeTab==="captions"&&(
                <div>
                  <div style={{display:"flex",gap:7,marginBottom:8}}><button className="btn btn-primary btn-xs" onClick={addCaption}>+ Add Caption</button>{selectedCaption&&<button className="btn btn-danger btn-xs" onClick={()=>{setCaptions(cs=>cs.filter(c=>c.id!==selectedCaption));setSelectedCaption(null);}}>Delete</button>}</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {captions.map(cap=>(
                      <div key={cap.id} style={{background:"var(--bg-2)",border:`1.5px solid ${selectedCaption===cap.id?"var(--cyan)":"var(--border)"}`,borderRadius:"var(--radius-sm)",padding:"7px 10px",cursor:"pointer",minWidth:180}} onClick={()=>setSelectedCaption(cap.id)}>
                        {selectedCaption===cap.id
                          ? <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              <input value={cap.text} onChange={e=>setCaptions(cs=>cs.map(c=>c.id===cap.id?{...c,text:e.target.value}:c))} style={{fontSize:11,padding:"2px 6px"}} />
                              <div style={{display:"flex",gap:3}}>
                                {CAP_STYLES.map(s=><button key={s} onClick={()=>setCaptions(cs=>cs.map(c=>c.id===cap.id?{...c,style:s}:c))} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:`1px solid ${cap.style===s?"var(--brand)":"var(--border)"}`,background:cap.style===s?"var(--brand-lt)":"var(--bg-3)",cursor:"pointer",color:"var(--text-3)",fontFamily:"var(--font)"}}>{s}</button>)}
                              </div>
                            </div>
                          : <div><div style={{fontSize:11,fontWeight:600}}>{cap.text}</div><div style={{fontSize:9,color:"var(--text-4)",fontFamily:"var(--mono)",marginTop:2}}>{fmtTime(cap.startTime)} → {fmtTime(cap.endTime)} · {cap.style}</div></div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab==="music"&&(
                <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                  {music ? (
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{background:"var(--brand-lt)",border:"1px solid rgba(108,92,231,0.3)",borderRadius:"var(--radius-sm)",padding:"8px 14px"}}>
                        <div style={{fontWeight:600,fontSize:12}}>♪ {music.name}</div>
                        <div style={{fontSize:10,color:"var(--text-3)"}}>{music.mood}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <label style={{margin:0,fontSize:11}}>Vol</label>
                        <input type="range" min={0} max={1} step={0.05} value={music.volume} onChange={e=>setMusic(m=>m?{...m,volume:+e.target.value}:m)} style={{width:70,accentColor:"var(--brand)"}} />
                        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-3)"}}>{Math.round(music.volume*100)}%</span>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={()=>setMusic(null)}>Remove</button>
                    </div>
                  ) : (
                    <div><div style={{fontSize:12,color:"var(--text-3)",marginBottom:7}}>Add background music:</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{musicTracks.slice(0,8).map(t=><button key={t.id} className="btn btn-ghost btn-xs" onClick={()=>addMusic(t)}>♪ {t.name}</button>)}</div></div>
                  )}
                </div>
              )}
              {activeTab==="export"&&(
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:5}}>Export Settings</div>
                    <div style={{fontSize:11,color:"var(--text-3)",lineHeight:1.7}}>
                      Range: {fmtTime(trimStart)} → {fmtTime(trimEnd)} · Duration: {fmtTime(trimEnd-trimStart)}<br/>
                      Captions: {captions.length} · Music: {music?music.name:"None"} · Clips: {clips.length}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    <button className="btn btn-primary btn-sm" onClick={exportTimeline}>📤 Export MP4</button>
                    <button className="btn btn-outline btn-sm" onClick={()=>toast.info("Use Shorts Factory for canvas .webm export")}>🖥️ Canvas WebM</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
