import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ExternalLink,FileText,Minus,Plus,RotateCcw,X} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;

type Props={url:string;title:string;initialPage?:number;onClose:()=>void};
const clamp=(value:number,max:number)=>Math.max(1,Math.min(max,Math.floor(value)||1));

/** Viewer độc lập với iframe: được tái sử dụng cho file public hoặc signed URL trong tương lai. */
export function DocumentViewer({url,title,initialPage=1,onClose}:Props){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
 const [page,setPage]=useState(Math.max(1,initialPage));
 const [scale,setScale]=useState(1);
 const [loading,setLoading]=useState(true);
 const [rendering,setRendering]=useState(false);
 const [error,setError]=useState('');
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const dialogRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const restoreFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  restoreFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const nodes=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]');
    if(!nodes?.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey);restoreFocus.current?.focus()};
 },[onClose]);
 useEffect(()=>{
  let disposed=false;
  setError('');setLoading(true);setPdf(null);setPage(Math.max(1,initialPage));
  const task=pdfjs.getDocument({url});
  void task.promise.then(document=>{
   if(disposed){void document.destroy();return;}
   setPdf(document);setPage(clamp(initialPage,document.numPages));setLoading(false);
  }).catch(reason=>{
   if(disposed)return;
   console.error('Không tải được tài liệu PDF',reason);
   setError('Không mở được tài liệu trong ứng dụng. Bạn có thể thử mở bằng trình duyệt.');setLoading(false);
  });
  return()=>{disposed=true;void task.destroy()};
 },[url,initialPage]);
 useEffect(()=>{
  if(!pdf||!canvasRef.current)return;
  let disposed=false;
  let renderTask:RenderTask|undefined;
  setRendering(true);setError('');
  void pdf.getPage(page).then(pdfPage=>{
   if(disposed)return;
   const canvas=canvasRef.current;
   const context=canvas?.getContext('2d');
   if(!canvas||!context)throw new Error('Canvas unavailable');
   const viewport=pdfPage.getViewport({scale});
   const ratio=Math.min(window.devicePixelRatio||1,2);
   canvas.width=Math.ceil(viewport.width*ratio);
   canvas.height=Math.ceil(viewport.height*ratio);
   canvas.style.width=`${viewport.width}px`;
   canvas.style.height=`${viewport.height}px`;
   renderTask=pdfPage.render({canvasContext:context,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
   return renderTask.promise;
  }).then(()=>{if(!disposed)setRendering(false)}).catch(reason=>{
   if(disposed||reason?.name==='RenderingCancelledException')return;
   console.error('Không hiển thị được trang PDF',reason);
   setError('Không thể hiển thị trang PDF này. Vui lòng thử lại hoặc mở bằng trình duyệt.');setRendering(false);
  });
  return()=>{disposed=true;renderTask?.cancel()};
 },[pdf,page,scale]);
 const total=pdf?.numPages??0;
 const externalUrl=`${url.split('#')[0]}#page=${page}`;
 return <div className="dk-pdf-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="dk-pdf-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Xem tài liệu ${title}`}>
   <header className="dk-pdf-header"><div className="dk-pdf-title"><FileText size={18}/><strong title={title}>{title}</strong><small>{total?`Trang ${page}/${total}`:'Đang mở tài liệu'}</small></div><button ref={closeRef} type="button" className="dk-pdf-icon" onClick={onClose} aria-label="Đóng tài liệu"><X size={20}/></button></header>
   <div className="dk-pdf-tools" aria-label="Điều khiển tài liệu">
    <button type="button" disabled={!pdf||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ArrowLeft size={16}/><span>Trước</span></button>
    <label className="dk-pdf-page">Trang <input aria-label="Số trang PDF" type="number" min={1} max={total||1} value={page} onChange={e=>setPage(clamp(Number(e.target.value),total||1))}/>/{total||'—'}</label>
    <button type="button" disabled={!pdf||page>=total} onClick={()=>setPage(p=>Math.min(total,p+1))}><span>Tiếp</span><ArrowRight size={16}/></button>
    <span className="dk-pdf-tools-spacer"/>
    <button type="button" aria-label="Thu nhỏ" disabled={scale<=0.6} onClick={()=>setScale(v=>Math.max(0.6,Math.round((v-0.2)*10)/10))}><Minus size={16}/></button>
    <span className="dk-pdf-zoom">{Math.round(scale*100)}%</span>
    <button type="button" aria-label="Phóng to" disabled={scale>=2.4} onClick={()=>setScale(v=>Math.min(2.4,Math.round((v+0.2)*10)/10))}><Plus size={16}/></button>
    <button type="button" aria-label="Đặt lại độ phóng" onClick={()=>setScale(1)}><RotateCcw size={15}/></button>
   </div>
   <div className="dk-pdf-body" aria-live="polite">
    {loading&&<div className="dk-pdf-message" role="status">Đang tải tài liệu PDF…</div>}
    {error&&<div className="dk-pdf-message dk-pdf-error" role="alert">{error}</div>}
    {pdf&&<div className="dk-pdf-canvas-shell"><canvas ref={canvasRef} aria-label={`Trang ${page} của tài liệu ${title}`}/>{rendering&&<div className="dk-pdf-rendering" role="status">Đang hiển thị trang…</div>}</div>}
   </div>
   <footer className="dk-pdf-footer"><span>Phóng to và kéo ngang để đọc trên điện thoại.</span><a href={externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Mở bằng trình duyệt</a></footer>
  </div>
 </div>;
}
