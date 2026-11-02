"use client";
import {useState, useRef, useEffect, type FormEvent} from "react";
import {Camera, ImagePlus, LoaderCircle, ArrowRight, Check} from "lucide-react";
import {categories, todayKorea, checkFields, type ItemFields, type BoardItem} from "@/lib/item-fields";

export async function requestJSON<T = unknown>(url:string, init?:RequestInit): Promise<T> {
  const response = await fetch(url, {...init, cache:"no-store"});
  let body; try { body=await response.json(); } catch { throw new Error("연결을 확인한 뒤 다시 시도해 주세요."); }
  if (!response.ok) throw new Error((body as {error?:string} | null)?.error || "요청을 완료하지 못했어요. 다시 시도해 주세요.");
  return body as T;
}
async function convertPhoto(file: File):Promise<Blob> {
  if(file.size > 24*1024*1024) throw new Error("원본 사진은 24MB 이하로 선택해 주세요.");
  const url=URL.createObjectURL(file);
  try {
    const img=new Image(); img.src=url;
    try { await img.decode(); } catch { throw new Error("이 사진을 읽을 수 없어요. JPG, PNG 또는 WebP 사진을 선택해 주세요."); }
    const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("사진을 처리할 수 없어요.");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.8));
    if(!data || data.size>2_200_000) throw new Error("더 작은 사진을 선택해 주세요.");
    return data;
  } finally {URL.revokeObjectURL(url);}
}
export function ItemForm({initial,signedIn,onSave,onBusy}:{initial?:BoardItem;signedIn:boolean;onSave:()=>void;onBusy:(busy:boolean)=>void}) {
  const [fields,setFields]=useState<ItemFields>(initial || {name:"",category:"",foundOn:todayKorea(),foundAt:"",keptAt:"",description:""});
  const [photo,setPhoto]=useState<Blob|null>(null),[preview,setPreview]=useState(""),[error,setError]=useState(""),[working,setWorking]=useState(false),[converting,setConverting]=useState(false);
  const seq=useRef(0),locked=useRef(false);
  useEffect(()=>{if(!photo){setPreview("");return;} const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo]);
  const change=(key:keyof ItemFields,value:string)=>setFields(p=>({...p,[key]:value}));
  async function pick(file?:File) {
    if(!file)return; const token=++seq.current;setConverting(true);setPhoto(null);setError("");
    try{const data=await convertPhoto(file);if(seq.current===token)setPhoto(data);}
    catch(e){if(seq.current===token)setError((e as Error).message);}
    finally{if(seq.current===token)setConverting(false);}
  }
  async function submit(e:FormEvent) {
    e.preventDefault(); if(locked.current)return;
    setError("");
    try {
      const data=checkFields(fields as unknown as Record<string,unknown>);
      if(!initial&&!photo)throw new Error("물건을 알아볼 수 있는 사진 한 장을 선택해 주세요.");
      if(!signedIn)throw new Error("게시물을 등록하려면 로그인해 주세요.");
      locked.current=true;setWorking(true);onBusy(true);
      if(initial){await requestJSON("/api/items/"+initial.id,{method:"PATCH",headers:{"Content-Type":"application/json","X-Found-Desk":"1"},body:JSON.stringify(data)});}
      else {const form=new FormData();for(const [key,value] of Object.entries(data))form.append(key,value);form.append("photo",photo!,"found.jpg");
        await requestJSON("/api/items",{method:"POST",headers:{"X-Found-Desk":"1"},body:form});}
      onSave();
    } catch(e){setError((e as Error).message);}
    finally{locked.current=false;setWorking(false);onBusy(false);}
  }
  return <form onSubmit={submit} className="item-form">
    <p className="form-intro">물건을 찾으러 갈 수 있도록 습득 위치와 현재 보관 장소를 구분해 적어 주세요.</p>
    {!initial && <div className="field"><label htmlFor="photo">물건 사진 <span>*</span></label><label className={"upload "+(preview?"has-photo":"")} htmlFor="photo">
      {preview ? <img src={preview} alt="등록할 물건 미리보기"/> : <div className="upload-icon"><Camera size={23}/></div>}
      <div><strong>{converting?"사진을 준비하고 있어요":preview?"다른 사진 선택":"사진 선택 또는 촬영"}</strong><small>JPG · PNG · WebP · 원본 최대 24MB</small></div>
      <input id="photo" type="file" accept="image/*" disabled={working} onChange={e=>{void pick(e.target.files?.[0]);e.target.value="";}}/>
      <ImagePlus size={19} className="upload-end"/></label>
      <small className="field-hint">이름표, 학생증 번호, 얼굴은 가려 주세요.</small></div>}
    <div className="form-grid">
      <label className="field">물건 이름 <input required maxLength={60} value={fields.name} onChange={e=>change("name",e.target.value)} placeholder="예: 초록색 필통"/></label>
      <label className="field">분류 <select required value={fields.category} onChange={e=>change("category",e.target.value)}><option value="">분류 선택</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <div className="form-grid">
      <label className="field">습득 위치 <input required maxLength={100} value={fields.foundAt} onChange={e=>change("foundAt",e.target.value)} placeholder="예: 도서관 창가 책상"/></label>
      <label className="field">습득 날짜 <input type="date" required max={todayKorea()} value={fields.foundOn} onChange={e=>change("foundOn",e.target.value)}/></label>
    </div>
    <label className="field">현재 보관 장소 <input required maxLength={100} value={fields.keptAt} onChange={e=>change("keptAt",e.target.value)} placeholder="예: 2층 교무실 분실물 보관함"/><small className="field-hint">직접 보관 중이라면 교내에서 인계할 장소를 적어 주세요.</small></label>
    <label className="field">물건의 특징 <span className="optional">선택</span><textarea rows={2} maxLength={500} value={fields.description} onChange={e=>change("description",e.target.value)} placeholder="색상이나 모양 등 알아보기 쉬운 특징"/></label>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="form-footer"><small><Check size={14}/> 작성자가 보관 정보와 반환 상태를 관리해요.</small>
      {signedIn?<button className="btn primary" type="submit" disabled={working||converting}>{working?<LoaderCircle className="spin" size={17}/>:null}{initial?"수정 저장":"습득물 등록"} <ArrowRight size={16}/></button>:<a className="btn primary" target="_top" href="/signin-with-chatgpt?return_to=%2F">로그인하고 등록하기 <ArrowRight size={16}/></a>}</div>
  </form>;
}
