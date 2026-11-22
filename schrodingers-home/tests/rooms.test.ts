import { describe, expect, it } from 'vitest';
import { ROOMS, wallRects } from '../src/data/roomLayouts';
import { assetById } from '../src/assets/manifest';
import { interactableById } from '../src/data/interactables';
import { newGameState } from '../src/state/initial';

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
      for (const door of room.doors) {
        const [x,y,w,h] = door.rect;
        expect(queue.some(([px,py]) => px>=x && px<=x+w && py>=y && py<=y+h), `${id}/${door.id} crossing is blocked`).toBe(true);
      }
      for(const o of room.objects.filter(o=>!o.decor && o.hit)) {
        const [w,h]=o.hit!, top=o.y+(o.hitOffsetY??0)-h;
        const accessible=queue.some(([x,y]) => Math.hypot(Math.max(o.x-w/2-x,0,x-o.x-w/2),Math.max(top-(y-4),0,y-4-top-h)) <= (o.reach??18));
        expect(accessible, `${id}/${o.id} cannot be reached with the keyboard`).toBe(true);
      }
    });
  }
});

it('main rooms have about a third less floor area and horizontal left beds', () => {
  for (const id of ['common','left','right'] as const) {
    const [, ,w,h] = ROOMS[id].floorRect;
    expect(1-w*h/(30*14)).toBeCloseTo(0.3143, 3);
  }
  for (const id of ['bed.left','dorm.secondBed']) {
    const bed = ROOMS.left.objects.find(o=>o.id===id)!;
    expect(bed.solid![0]).toBeGreaterThan(bed.solid![1]);
  }
});

// Furniture must look separated as well as leave a reachable interaction point.
// Pickups, the gramophone hatch and storage resting on wardrobes are intentional layers.
describe('visible furniture spacing', () => {
  const state = newGameState('layout', 1);
  for (const id of ['common','left','right'] as const) {
    it(`${id}: floor furniture artwork does not overlap`, () => {
      const furniture = ROOMS[id].objects.filter(o => o.layer === 'y' && (o.solid || o.id === 'sink'));
      const bounds = furniture.map(o => {
        const asset = assetById(o.asset ?? interactableById(o.id)!.asset(state))!;
        return { id:o.id, left:o.x-asset.width/2, right:o.x+asset.width/2, top:o.y-asset.height, bottom:o.y };
      });
      for(let i=0;i<bounds.length;i++) for(let j=i+1;j<bounds.length;j++) {
        const a=bounds[i], b=bounds[j];
        const overlap=a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
        expect(overlap, `${id}: ${a.id} artwork overlaps ${b.id}`).toBe(false);
      }
    });
  }
  it('beds follow the requested walls and common has four corner desks and four lounge seats', () => {
    const topLeft=ROOMS.left.objects.find(o=>o.id==='dorm.secondBed')!;
    const bottomLeft=ROOMS.left.objects.find(o=>o.id==='bed.left')!;
    expect(topLeft.y).toBeLessThan(120);
    expect(bottomLeft.y).toBeGreaterThan(230);
    expect(topLeft.x).toBe(bottomLeft.x);
    const topRight=ROOMS.right.objects.find(o=>o.id==='dorm.secondBed')!;
    const sideRight=ROOMS.right.objects.find(o=>o.id==='bed.right')!;
    expect(topRight.solid![0]).toBeGreaterThan(topRight.solid![1]);
    expect(topRight.y).toBeLessThan(120);
    expect(sideRight.solid![0]).toBeLessThan(sideRight.solid![1]);
    expect(sideRight.x).toBeGreaterThan(400);
    const desks=ROOMS.common.objects.filter(o=>o.asset==='dorm.desk');
    expect(desks).toHaveLength(4);
    expect(new Set(desks.map(o=>`${o.x<256?'left':'right'}-${o.y<160?'top':'bottom'}`)).size).toBe(4);
    expect(ROOMS.common.objects.filter(o=>o.id==='couch'||o.asset==='dorm.couch')).toHaveLength(3);
    expect(ROOMS.common.objects.filter(o=>o.asset==='dorm.recliner')).toHaveLength(1);
  });
});
