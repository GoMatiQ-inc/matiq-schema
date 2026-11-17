export const TABLE_WIDTH = 280, HEADER_HEIGHT = 34, ROW_HEIGHT = 26;
export const tableHeight = table => HEADER_HEIGHT + table.fields.length * ROW_HEIGHT;
export const fieldY = (table, field) => HEADER_HEIGHT + (Math.max(0, table.fields.findIndex(f => f.name === field)) + .5) * ROW_HEIGHT;
export function cardinality(relation) {
  const values = {'1':{many:false,optional:false,label:'exactly one'},'*':{many:true,optional:false,label:'many'},'0..1':{many:false,optional:true,label:'zero or one'},'0..*':{many:true,optional:true,label:'zero or many'},'1..*':{many:true,optional:false,label:'one or many'}};
  if (!values[relation]) throw Error('Unsupported relationship cardinality: '+relation);
  return values[relation];
}
const blocked = (a,b,rects) => rects.some(r => a.x === b.x
  ? a.x > r.x-8 && a.x < r.x+r.width+8 && Math.max(a.y,b.y)>r.y-8 && Math.min(a.y,b.y)<r.y+r.height+8
  : a.y > r.y-8 && a.y < r.y+r.height+8 && Math.max(a.x,b.x)>r.x-8 && Math.min(a.x,b.x)<r.x+r.width+8);
const length = points => points.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-points[i].x)+Math.abs(p.y-points[i].y),0);
// Route between outward stubs, keeping every segment horizontal or vertical.
export function routeOrthogonal(start,end,rects) {
  const xs=[...new Set([start.x,end.x,...rects.flatMap(r=>[r.x-24,r.x+r.width+24])])].sort((a,b)=>a-b);
  const ys=[...new Set([start.y,end.y,...rects.flatMap(r=>[r.y-24,r.y+r.height+24])])].sort((a,b)=>a-b);
  const candidates=[...xs.map(x=>[start,{x,y:start.y},{x,y:end.y},end]),...ys.map(y=>[start,{x:start.x,y},{x:end.x,y},end])];
  const clear=candidates.filter(ps=>ps.slice(1).every((p,i)=>!blocked(ps[i],p,rects))).sort((a,b)=>length(a)-length(b));
  if(clear.length)return clear[0];
  const queue=[{x:xs.indexOf(start.x),y:ys.indexOf(start.y),axis:'',cost:0,points:[start]}],best=new Map();
  while(queue.length) {
    queue.sort((a,b)=>b.cost-a.cost);const current=queue.pop();
    const key=`${current.x},${current.y},${current.axis}`;
    if(best.has(key)&&best.get(key)<=current.cost)continue;
    best.set(key,current.cost);
    const point={x:xs[current.x],y:ys[current.y]};
    if(point.x===end.x&&point.y===end.y)return current.points;
    for(const [dx,dy,axis] of [[-1,0,'h'],[1,0,'h'],[0,-1,'v'],[0,1,'v']]) {
      const x=current.x+dx,y=current.y+dy;if(x<0||y<0||x>=xs.length||y>=ys.length)continue;
      const next={x:xs[x],y:ys[y]};if(blocked(point,next,rects))continue;
      const cost=current.cost+Math.abs(next.x-point.x)+Math.abs(next.y-point.y)+(current.axis&&current.axis!==axis?16:0);
      if(!best.has(`${x},${y},${axis}`)||best.get(`${x},${y},${axis}`)>cost)queue.push({x,y,axis,cost,points:[...current.points,next]});
    }
  }
  throw Error('Separate overlapping tables or choose Auto layout to route their relationships.');
}
export function connection(a,b,tables,positions,offsetA=0,offsetB=0) {
  const ta=tables.find(t=>t.key===a.key),tb=tables.find(t=>t.key===b.key),pa=positions[a.key],pb=positions[b.key];
  let da=1,db=1;
  if(pa.x+TABLE_WIDTH+40<=pb.x){da=1;db=-1;}
  else if(pb.x+TABLE_WIDTH+40<=pa.x){da=-1;db=1;}
  const first={x:pa.x+(da===1?TABLE_WIDTH:0),y:pa.y+fieldY(ta,a.fieldNames[0])+offsetA,direction:da};
  const last={x:pb.x+(db===1?TABLE_WIDTH:0),y:pb.y+fieldY(tb,b.fieldNames[0])+offsetB,direction:db};
  const start={x:first.x+da*32,y:first.y},end={x:last.x+db*32,y:last.y};
  let route=routeOrthogonal(start,end,tables.map(t=>({...positions[t.key],width:TABLE_WIDTH,height:tableHeight(t)})));
  if(a.key===b.key&&start.y===end.y)route=[start,{x:start.x+24,y:start.y},{x:start.x+24,y:start.y-18},{x:end.x,y:end.y-18},end];
  const points=[first,...route,last];
  return {first,last,path:points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')};
}
