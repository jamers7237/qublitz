/** D107 furnishings interpreted from the supplied room photographs.
 * Native canvas pixels keep the same crisp style as the game's original art.
 */
import type { Drawer } from './procedural';
type G = CanvasRenderingContext2D;
const ink = '#292733', wood = '#bd905e', edge = '#765434';
const r = (g:G,x:number,y:number,w:number,h:number,c:string) => { g.fillStyle=c; g.fillRect(x,y,w,h); };
const box = (g:G,x:number,y:number,w:number,h:number,c:string) => {r(g,x,y,w,h,ink);r(g,x+1,y+1,w-2,h-2,c);};
const grain = (g:G,x:number,y:number,w:number,h:number) => {r(g,x,y,w,h,wood);for(let i=3;i<w;i+=5) r(g,x+i,y,1,h,'#c99d6a');};
export const dormBed = (color:string):Drawer => (g) => {
  box(g,0,2,40,56,edge); grain(g,1,3,38,5);
  box(g,3,8,34,46,color);box(g,5,9,30,11,'#d3dce1');
  r(g,4,23,32,30,color);r(g,7,26,1,24,'#697782');r(g,18,24,1,28,'#697782');
  r(g,29,30,1,22,'#697782');r(g,4,23,32,2,'#a9b5ba');
  grain(g,0,53,40,5);r(g,3,58,4,2,edge);r(g,33,58,4,2,edge);
  // Storage drawers under each bed.
  box(g,6,55,12,3,'#8b725c');box(g,22,55,12,3,'#8b725c');
};
export const bayWindow:Drawer = (g,w,h) => {
  // Four dark wood framed panes, angled outer returns, cream roller blinds.
  r(g,0,0,w,h,'#b7b5bb');
  for(let i=0;i<4;i++) {const x=4+i*30,y=i===0||i===3?8:2;
    box(g,x,y,29,h-y-4,edge);r(g,x+3,y+3,23,h-y-10,'#172b42');
    r(g,x+3,y+3,23,18,'#e6dfce');r(g,x+3,y+20,23,2,'#bfb7a9');
    r(g,x+14,y+22,1,10,'#e5d7b9');r(g,x+5,h-9,2,2,'#c1d4e3');
  }
  r(g,0,h-4,w,4,edge);r(g,2,h-4,w-4,1,'#c8a070');
  // The center pane is raised: the CAT window remains visibly open.
  r(g,66,25,19,12,'#10243c');r(g,64,23,23,2,'#c5bca9');
  // Mini basketball hoop from the common-room window.
  box(g,55,16,19,13,'#cec4be');box(g,59,20,11,6,'#8a4a4d');
  r(g,60,26,10,1,'#cd795d');for(let x=61;x<70;x+=3)r(g,x,27,1,7,'#d8d2c7');
};
export const DORM:Record<string,Drawer> = {
  'dorm.led':(g,w)=>{r(g,0,2,w,4,'#8a8dbc');r(g,0,3,w,1,'#c3c7ef');for(let x=2;x<w;x+=6)r(g,x,2,2,2,'#f3f1ff');},
  'dorm.collage':(g)=>{for(let i=0;i<23;i++){const x=(i*17)%77,y=(i%3)*9;box(g,x,y,7,8,['#a8a6b8','#6a7b82','#b18a82','#d5b9a1'][i%4]);r(g,x+2,y+2,3,3,'#e1cec2');}},
  'dorm.whiteboard':(g)=>{box(g,0,0,50,28,'#dfdfd7');for(let y=6;y<23;y+=4)r(g,5,y,18+(y%7),1,'#7f8994');r(g,31,9,10,1,'#ad665e');r(g,37,6,1,12,'#ad665e');r(g,7,26,35,2,'#7a7d82');},
  'dorm.desk':(g)=>{grain(g,0,10,64,10);r(g,0,10,64,1,'#e7c697');box(g,3,20,17,14,'#ad865c');r(g,6,25,11,1,edge);r(g,6,30,11,1,edge);r(g,58,20,3,14,edge);box(g,24,4,21,12,'#454953');r(g,26,6,17,7,'#808b9e');r(g,23,17,24,2,'#484852');box(g,5,5,9,6,'#ede4ce');r(g,51,6,4,7,'#a96762');r(g,52,4,2,2,'#e2dfd3');},
  'dorm.chair':(g)=>{box(g,3,0,18,18,'#7d8587');r(g,5,2,14,13,'#969d9b');box(g,1,15,22,8,'#6b7578');r(g,11,23,2,4,ink);r(g,4,27,16,1,ink);},
  'dorm.ottoman':(g)=>{box(g,0,4,30,19,'#933e49');box(g,1,0,28,16,'#b95160');r(g,4,2,22,1,'#ce6d73');box(g,10,2,14,10,'#8075a6');r(g,13,3,8,2,'#b1a4cc');},
  'dorm.dino':(g)=>{ // Green foil dinosaur balloon, with a trailing string.
    r(g,21,38,1,24,'#b4b0ad');r(g,18,53,4,1,'#b4b0ad');
    box(g,10,12,17,25,'#37785a');box(g,8,3,22,15,'#37785a');
    r(g,5,8,14,8,'#37785a');r(g,8,5,11,3,'#65a77b');r(g,13,7,2,2,'#ecedce');r(g,13,8,1,1,ink);
    r(g,10,17,3,14,'#9fae75');r(g,5,24,8,4,'#37785a');r(g,24,22,7,4,'#37785a');
    r(g,25,32,9,4,'#37785a');r(g,32,27,5,7,'#37785a');r(g,35,22,3,8,'#37785a');
    r(g,9,35,8,6,'#37785a');r(g,21,35,8,6,'#37785a');r(g,9,40,10,2,'#60a071');r(g,21,40,10,2,'#60a071');
    r(g,23,19,2,13,'#65a77b');r(g,7,11,5,1,'#c0cf9c');
  },
  'dorm.wardrobe':(g)=>{box(g,0,0,44,64,edge);grain(g,2,2,40,60);r(g,21,3,2,57,edge);r(g,18,26,2,7,ink);r(g,24,26,2,7,ink);for(let y=48;y<61;y+=6){r(g,3,y,38,1,edge);r(g,17,y+3,10,1,edge);}},
  'dorm.blinds':(g)=>{box(g,0,0,80,40,edge);for(const x of [3,42]){r(g,x,3,35,32,'#203044');r(g,x,3,35,23,'#e3dece');r(g,x,25,35,2,'#bcb6a7');r(g,x+18,27,1,9,'#d7cdb5');}r(g,0,37,80,3,edge);},
  'dorm.sconce':(g)=>{r(g,1,1,16,12,'#c7c5be');r(g,2,3,14,3,'#f3e9bc');r(g,2,10,14,2,'#f3e9bc');r(g,3,0,12,1,'#fff2bf');},
  'dorm.rack':(g)=>{r(g,2,0,26,2,ink);r(g,3,1,2,50,ink);r(g,26,1,2,50,ink);r(g,0,52,30,2,ink);box(g,6,6,8,29,'#4c769b');box(g,17,8,9,27,'#55565b');r(g,8,7,4,1,'#a6bed0');},
  'dorm.bed.blue':dormBed('#425a74'), 'dorm.bed.sage':dormBed('#899b94'),
};
