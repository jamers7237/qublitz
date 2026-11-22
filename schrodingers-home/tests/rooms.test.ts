import { describe, expect, it } from 'vitest';
import { ROOMS, wallRects } from '../src/data/roomLayouts';

// WorldScene's player body occupies the bottom six pixels of the sprite.
const clear = (room: typeof ROOMS.common, x: number, y: number) => {
  const obstacles = [...wallRects(room), ...room.objects.filter(o => o.solid).map(o => [o.x-o.solid![0]/2,o.y-o.solid![1],...o.solid!] as [number,number,number,number])];
  return x>=5 && x<=507 && y>=6 && y<=288 && !obstacles.some(([a,b,w,h]) => x+5>a && x-5<a+w && y>b && y-6<b+h);
};

describe('photo-referenced room circulation', () => {
  for (const id of ['common','left','right'] as const) {
    it(`${id}: every entry spawn is clear and every hotspot is reachable`, () => {
      const room=ROOMS[id];
      for (const [name,[x,y]] of Object.entries(room.spawns)) expect(clear(room,x,y), `${id}/${name} spawns in furniture`).toBe(true);
      const [sx,sy]=room.spawns.center;
      const queue:[number,number][]=[[sx,sy]];
      const seen=new Set([`${sx},${sy}`]);
      for(let i=0;i<queue.length;i++) {
        const [x,y]=queue[i];
        for(const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4]]) {
          const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
          if(!seen.has(key) && clear(room,nx,ny)){seen.add(key);queue.push([nx,ny]);}
        }
      }
      for(const o of room.objects.filter(o=>!o.decor && o.hit)) {
        const [w,h]=o.hit!, top=o.y+(o.hitOffsetY??0)-h;
        const accessible=queue.some(([x,y]) => Math.hypot(Math.max(o.x-w/2-x,0,x-o.x-w/2),Math.max(top-(y-4),0,y-4-top-h)) <= (o.reach??18));
        expect(accessible, `${id}/${o.id} cannot be reached with the keyboard`).toBe(true);
      }
    });
  }
});
