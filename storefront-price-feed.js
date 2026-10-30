(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TrecaPriceFeed=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const norm=v=>String(v??'').normalize('NFKC').replace(/[\s\u3000]+/g,'').toUpperCase();
  const kind=v=>['シングル','素体'].includes(norm(v))?'シングル':norm(v);
  const validId=v=>v!==undefined&&v!==null&&!['','NULL','UNDEFINED'].includes(norm(v));
  function jstParts(now){
    const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
    const x=Object.fromEntries(p.map(z=>[z.type,z.value]));return{date:x.year+'-'+x.month+'-'+x.day,hour:Number(x.hour)};
  }
  function match(item,entry,category){
    if(entry.category!==category||kind(entry.type)!==kind(item.type)||norm(entry.name)!==norm(item.name)||norm(entry.modelNumber)!==norm(item.modelNumber))return false;
    if(validId(entry.id)&&validId(item.id))return norm(entry.id)===norm(item.id);
    // Original data contains duplicated/null IDs. An exact image identity is required there.
    return !!entry.imageUrl&&!!item.imageUrl&&entry.imageUrl.split('?')[0]===item.imageUrl.split('?')[0];
  }
  function apply(data,category,feed,options={}){
    if(!data||!Array.isArray(data.items)||!feed||feed.enabled!==true||feed.schemaVersion!==1||!Array.isArray(feed.items))return data;
    const now=options.now?new Date(options.now):new Date();if(!Number.isFinite(now.getTime()))return data;
    const parts=jstParts(now);let changed=0;
    const items=data.items.map(item=>{
      const type=kind(item.type);if(type!=='PSA10'&&type!=='シングル')return item;
      const candidates=feed.items.filter(e=>e.channel==='storefront'&&match(item,e,category));
      if(candidates.length!==1)return item;
      const entry=candidates[0];if(entry.price!==null&&!(Number.isSafeInteger(entry.price)&&entry.price>0))return item;
      const at=new Date(entry.confirmedAt);if(!Number.isFinite(at.getTime())||at>now)return item;
      const date=jstParts(at).date;
      const expired=type==='PSA10'?entry.effectiveDate!==parts.date:(date<parts.date&&parts.hour>=12);
      changed++;
      return{...item,price:expired||entry.price===null?'ASK':entry.price,priceConfirmedAt:entry.confirmedAt};
    });
    return changed?{...data,items,priceFeedUpdatedAt:feed.updatedAt}:data;
  }
  function confirmedLabel(value){
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return'';
    return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)+' 確認';
  }
  return{apply,confirmedLabel};
});

