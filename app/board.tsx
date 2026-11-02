"use client";
import {useCallback,useEffect,useRef,useState, type ReactNode} from "react";
import {Search,Plus,ArrowRight,ChevronDown,X,Tag,BookOpen,MapPin,CalendarDays,Archive,SlidersHorizontal,Camera,Inbox,ArrowUpRight,ArrowLeft,Check,LoaderCircle,FolderSearch,Pencil,Trash2,UsersRound,ClipboardList} from "lucide-react";
import {categories,type BoardItem, type Status} from "@/lib/item-fields";
import {ItemForm,requestJSON} from "./item-form";

const tabs=[["all","전체"],["keeping","보관 중"],["returned","반환 완료"]] as const;
const dateText=(s:string)=>s.replaceAll("-",". ");
const guide=[
  {n:"01",title:"물건을 발견했다면",text:"사진을 찍고 습득 위치와 날짜, 지금 보관 중인 장소를 등록해 주세요.",Icon:Camera},
  {n:"02",title:"내 물건을 찾았다면",text:"게시물에 적힌 보관 장소에 방문해 물건의 특징을 설명하고 수령하세요.",Icon:MapPin},
  {n:"03",title:"주인에게 돌려줬다면",text:"작성자가 ‘내 게시물’에서 물건을 선택해 반환 완료로 표시해 주세요.",Icon:Check},
];
function Modal({title,code,children,onClose,busy=false}:{title:string;code:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal(); const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{el?.close();document.body.style.overflow=previous;};},[]);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!busy){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
    <div className="dialog-head"><div><span className="eyebrow">{code}</span><h2 id="dialog-title">{title}</h2></div><button aria-label="닫기" className="iconbtn" onClick={onClose} disabled={busy}><X size={21}/></button></div>{children}</dialog>;
}
function GuideSteps(){return <ol className="guide-steps">{guide.map(({n,title,text,Icon})=><li key={n}><div className="step-icon"><Icon size={20}/></div><div><span className="eyebrow">STEP {n}</span><strong>{title}</strong><p>{text}</p></div></li>)}</ol>;}
function Card({item,open}:{item:BoardItem;open:()=>void}){
  return <button className="card" onClick={open}><div className="card-photo"><img loading="lazy" alt={item.name} src={"/api/items/"+item.id+"/photo"}/><span className={"badge "+item.status}>{item.status==="keeping"?"보관 중":"반환 완료"}</span></div><div className="card-copy"><span className="card-cat">{item.category}</span><h3>{item.name}</h3><p><MapPin/>{item.foundAt}</p><p><Archive/>{item.keptAt}</p><div className="card-date">{dateText(item.foundOn)} 습득 {item.mine&&<span>내 게시물</span>}</div></div></button>;
}
function Detail({item,edit,complete,busy,setBusy}:{item:BoardItem;edit:()=>void;complete:(m:string)=>void;busy:boolean;setBusy:(v:boolean)=>void}){
  const [error,setError]=useState(""),[confirm,setConfirm]=useState(false);
  async function mutate(remove=false) {
    if(busy)return;setBusy(true);setError("");
    try{ await requestJSON("/api/items/"+item.id,{method:remove?"DELETE":"PATCH",headers:{"Content-Type":"application/json","X-Found-Desk":"1"},body:remove?undefined:JSON.stringify({status:item.status==="keeping"?"returned":"keeping"})});
      complete(remove?"게시물을 삭제했어요.":item.status==="keeping"?"반환 완료로 표시했어요.":"보관 중으로 변경했어요.");
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="detail"><div className="detail-photo"><img src={"/api/items/"+item.id+"/photo"} alt={item.name}/></div><div className="detail-tags"><span className={"badge "+item.status}>{item.status==="keeping"?"보관 중":"반환 완료"}</span><span>{item.category}</span></div>
    <dl className="facts"><div><dt><MapPin/>습득 위치</dt><dd>{item.foundAt}</dd></div><div><dt><CalendarDays/>습득 날짜</dt><dd>{dateText(item.foundOn)}</dd></div><div className="storage-fact"><dt><Archive/>현재 보관 장소</dt><dd>{item.keptAt}</dd></div></dl>
    {item.description&&<p className="description">{item.description}</p>}
    {!item.mine && item.status==="keeping" && <div className="note">보관 장소에서 물건의 특징을 설명한 뒤 수령해 주세요.</div>}
    {item.mine&&<div className="manage">{confirm?<><p>이 게시물과 사진을 삭제할까요?</p><button className="btn light" disabled={busy} onClick={()=>setConfirm(false)}>취소</button><button className="btn danger" disabled={busy} onClick={()=>mutate(true)}>삭제하기</button></>:<><button className="btn primary" disabled={busy} onClick={()=>mutate()}><Check size={16}/>{item.status==="keeping"?"반환 완료 처리":"보관 중으로 변경"}</button><button className="btn light" onClick={edit} disabled={busy}><Pencil size={15}/> 수정</button><button className="iconbtn" aria-label="게시물 삭제" disabled={busy} onClick={()=>setConfirm(true)}><Trash2 size={17}/></button></>}</div>}
    {error&&<p role="alert" className="error">{error}</p>}</div>;
}
type Mode={type:"form";item?:BoardItem}|{type:"detail";item:BoardItem}|{type:"guide"}|null;
export default function Board({signedIn}:{signedIn:boolean}){
  const [mode,setMode]=useState<Mode>(null),[busy,setBusy]=useState(false),[mine,setMine]=useState(false);
  const [status,setStatus]=useState<Status|"all">("all"),[category,setCategory]=useState(""),[query,setQuery]=useState(""),[term,setTerm]=useState(""),[page,setPage]=useState(1);
  const [items,setItems]=useState<BoardItem[]>([]),[total,setTotal]=useState(0),[pageSize,setPageSize]=useState(12),[loading,setLoading]=useState(signedIn),[error,setError]=useState(""),[reload,setReload]=useState(0),[notice,setNotice]=useState("");
  const section=useRef<HTMLElement>(null);
  const showBoard=()=>section.current?.scrollIntoView({behavior:"smooth",block:"start"});
  useEffect(()=>{const t=setTimeout(()=>{setTerm(query.trim());setPage(1);},200);return()=>clearTimeout(t);},[query]);
  useEffect(()=>{
    if(!signedIn)return;const controller=new AbortController();setLoading(true);setError("");
    const params=new URLSearchParams({q:term,status,category,mine:mine?"1":"0",page:String(page)});
    requestJSON<{items:BoardItem[];total:number;pageSize:number}>("/api/items?"+params,{signal:controller.signal}).then(data=>{if(controller.signal.aborted)return;
      if(page>1&&data.items.length===0){setPage(Math.max(1,Math.ceil(data.total/data.pageSize)));return;}
      setItems(data.items);setTotal(data.total);setPageSize(data.pageSize);setLoading(false);
    }).catch(e=>{if(!controller.signal.aborted){setError((e as Error).message);setLoading(false);}});
    return()=>controller.abort();
  },[term,status,category,mine,page,reload,signedIn]);
  useEffect(()=>{if(!notice)return;const delay=setTimeout(()=>setNotice(""),4200);return()=>clearTimeout(delay);},[notice]);
  const refresh=useCallback(()=>setReload(n=>n+1),[]);
  useEffect(()=>{const onVisible=()=>{if(document.visibilityState==="visible")refresh();};document.addEventListener("visibilitychange",onVisible);return()=>document.removeEventListener("visibilitychange",onVisible);},[refresh]);
  function reset(){setStatus("all");setCategory("");setTerm("");setQuery("");setPage(1);}
  function navigate(m:boolean){setMine(m);reset();showBoard();}
  function done(message:string,created=false){setMode(null);setNotice(message); if(created){reset();setMine(false);}refresh();requestAnimationFrame(showBoard);}
  const filtered=!!(term||category||status!=="all");
  return <>
    <header className="site-head"><div className="header-inner"><a href="#" className="brand" aria-label="찾음 홈" onClick={e=>{e.preventDefault();setMine(false);reset();window.scrollTo({top:0,behavior:"smooth"});}}><img className="school-emblem" src="/art/school-emblem.png" alt="경남과학고등학교 교표" width="44" height="44"/><b>찾음</b><span className="school">경남과학고등학교</span></a>
      <nav aria-label="주 메뉴"><button className={!mine?"active":""} onClick={()=>navigate(false)}>분실물 게시판</button><button className={mine?"active":""} onClick={()=>navigate(true)}>내 게시물</button><button onClick={()=>setMode({type:"guide"})}>이용 안내</button></nav>
      <button className="btn primary header-post" onClick={()=>setMode({type:"form"})}><Plus size={17}/> 습득물 등록</button></div></header>
    <main className="shell">
      <section className="campus-banner" aria-labelledby="campus-heading">
        <svg className="campus-view" viewBox="0 0 1020 639" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <image href="/art/campus.webp" x="-433" y="-152" width="1902" height="791"/>
        </svg>
        <div className="campus-caption"><span>GYEONGNAM SCIENCE HIGH SCHOOL</span><h1 id="campus-heading">경남과학고 분실물 게시판</h1></div>
        <button className="campus-guide" onClick={()=>setMode({type:"guide"})}><BookOpen size={16}/> 이용 안내</button>
      </section>
      <section id="board" className="board-section" ref={section}>
        <div className="section-head"><div><div className="section-kicker"><span/> {mine?"MY RECORDS":"FOUND ITEMS"}</div><h2>{mine?"내 게시물":"습득물 게시판"}</h2></div>
          <button className="btn light mine-switch" onClick={()=>navigate(!mine)}>{mine?<ClipboardList size={15}/>:<UsersRound size={15}/>} {mine?"전체 게시판":"내 게시물"} <ArrowRight size={14}/></button>
        </div>
        <div className="board-layout"><div className="board-main">
          <div className="tools-row"><label className="search-box"><Search size={19}/><input aria-label="물건 이름, 습득 위치 또는 보관 장소 검색" placeholder="물건 이름이나 장소로 검색" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="검색어 지우기" onClick={()=>setQuery("")}><X size={16}/></button>}</label>
            <label className="category-select"><SlidersHorizontal size={15}/><select aria-label="물건 분류" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option value="">전체 분류</option>{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label>
          </div>
          <div className="tabs-row"><div className="tabs">{tabs.map(([k,text])=><button key={k} aria-pressed={k===status} className={k===status?"selected":""} onClick={()=>{setStatus(k);setPage(1);}}>{text}</button>)}</div><span className="count">{signedIn&&!loading&&!error?<>{total}건<i/></>:null}최신순</span></div>
          {loading?<div className="empty"><LoaderCircle className="spin"/><strong>습득물을 불러오는 중이에요</strong></div>:
          error?<div className="empty"><Inbox size={27}/><strong>게시판을 불러오지 못했어요</strong><p>{error}</p><button className="text-action" onClick={refresh}>다시 시도 <ArrowRight size={14}/></button></div>:
          items.length?<><div className="cards">{items.map(item=><Card key={item.id} item={item} open={()=>setMode({type:"detail",item})}/>)}</div>{total>pageSize&&<div className="pager"><button className="iconbtn" disabled={page===1} aria-label="이전 페이지" onClick={()=>setPage(p=>p-1)}><ArrowLeft size={16}/></button>{page} / {Math.ceil(total/pageSize)}<button className="iconbtn" disabled={page*pageSize>=total} aria-label="다음 페이지" onClick={()=>setPage(p=>p+1)}><ArrowRight size={16}/></button></div>}</>:
          <div className="empty"><div className="empty-symbol">{filtered?<FolderSearch size={29}/>:<Inbox size={29}/>}</div>
            <strong>{!signedIn?"로그인하고 습득물을 확인하세요":filtered?"조건에 맞는 습득물이 없어요":mine?"아직 작성한 게시물이 없어요":"아직 등록된 습득물이 없어요"}</strong>
            <p>{!signedIn?"학교 구성원에게 공유된 물건과 보관 장소를 볼 수 있어요.":filtered?"다른 검색어나 분류로 다시 찾아보세요.":"학교에서 발견한 물건을 사진과 함께 등록해 주세요."}</p>
            {!signedIn?<a className="text-action" target="_top" href="/signin-with-chatgpt?return_to=%2F">로그인하기 <ArrowRight size={14}/></a>:filtered?<button className="text-action" onClick={reset}>검색 조건 초기화 <ArrowRight size={14}/></button>:<button className="text-action" onClick={()=>setMode({type:"form"})}><Plus size={15}/> 습득물 등록</button>}</div>}
        </div>
        <aside className="guide-card"><div className="guide-over"><span className="round-icon"><BookOpen size={18}/></span><span>QUICK GUIDE</span></div><h3>이렇게 이용해요</h3><ol><li><b>01</b><span>발견한 물건을 등록해요.</span></li><li><b>02</b><span>보관 장소에서 수령해요.</span></li><li><b>03</b><span>반환 완료로 표시해요.</span></li></ol><button onClick={()=>setMode({type:"guide"})}>자세한 이용 안내 <ArrowRight size={15}/></button></aside>
        </div>
      </section>
    </main>
    <footer className="footer"><div><span className="footer-brand"><img alt="" src="/favicon.svg"/> 찾음</span><span>경남과학고등학교 분실물 게시판</span></div><small>CAMPUS LOST &amp; FOUND</small></footer>
    {notice&&<div role="status" className="toast"><Check size={17}/>{notice}</div>}
    {mode&&<Modal key={mode.type} title={mode.type==="guide"?"게시판 이용 안내":mode.type==="form"?mode.item?"습득물 정보 수정":"습득물 등록":mode.item.name} code={mode.type==="guide"?"FIELD GUIDE":mode.type==="form"?"PROPERTY RECORD":"ITEM DETAILS"} onClose={()=>setMode(null)} busy={busy}>
      {mode.type==="guide"?<div className="guide-content"><GuideSteps/><div className="note"><Tag size={17}/>사진에 이름, 연락처, 학생증 번호가 나오지 않도록 가려 주세요.</div><button className="btn primary" onClick={()=>setMode({type:"form"})}><Plus size={16}/>습득물 등록</button></div>:
      mode.type==="form"?<ItemForm initial={mode.item} signedIn={signedIn} onBusy={setBusy} onSave={()=>done(mode.item?"게시물을 수정했어요.":"습득물을 등록했어요.",!mode.item)}/>:
      <Detail key={mode.item.id} item={mode.item} busy={busy} setBusy={setBusy} edit={()=>setMode({type:"form",item:mode.item})} complete={done}/>}</Modal>}
  </>;
}
