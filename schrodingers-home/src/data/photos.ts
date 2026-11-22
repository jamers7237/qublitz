/**
 * Photos and papers that open in the zoom modal. Replace any image by dropping a file
 * at `path` (relative to /public). A designed placeholder renders if it is missing.
 * `overlay` is a clue drawn ON TOP of the image so it survives photo replacement.
 */
export interface PhotoDef {
  id: string;
  path: string;
  title: string;
  caption: string;
  alt: string;
  overlay?: { text: string; position: 'bottom-right' | 'top-left' | 'center' | 'bottom-left'; style: 'scratch' | 'ink' | 'projected' };
  placeholderScene: 'portrait' | 'dorm' | 'paper' | 'poster' | 'projection' | 'sticky';
}

export const PHOTOS: PhotoDef[] = [
  {
    id: 'james', path: 'assets/photos/james.jpg', title: 'Framed portrait',
    caption: 'J, mid-laugh, holding a toaster like a trophy. On the back of the frame someone has scratched something.',
    alt: 'Portrait of the roommate J (placeholder until a real photo is supplied).',
    overlay: { text: 'RR = third', position: 'bottom-right', style: 'scratch' }, placeholderScene: 'portrait',
  },
  {
    id: 'leftPhoto', path: 'assets/photos/dorm.jpg', title: 'Move-in day photo',
    caption: 'The suite on move-in day. The window is open. It was open then, too.',
    alt: 'Photo of the dorm suite on move-in day (placeholder).',
    overlay: { text: 'the window never closes', position: 'bottom-left', style: 'ink' }, placeholderScene: 'dorm',
  },
  {
    id: 'clipping', path: 'assets/photos/clipping.png', title: 'Scorched clipping',
    caption: 'A newspaper clipping with scorched edges.',
    alt: 'Newspaper clipping reading: Two rooms, more addresses than doors.',
    overlay: { text: 'TWO ROOMS, MORE ADDRESSES THAN DOORS', position: 'center', style: 'ink' }, placeholderScene: 'paper',
  },
  {
    id: 'poster', path: 'assets/photos/poster.png', title: 'Concert poster',
    caption: '"THE EIGENSTATES — LIVE AT THE BLOCH SPHERE. Two sets: Side Z, Side X." A route is a number, if you know where to begin.',
    alt: 'Concert poster for a band called The Eigenstates.',
    placeholderScene: 'poster',
  },
  {
    id: 'projector', path: 'assets/photos/projector.jpg', title: 'Projected photograph',
    caption: 'The old slide shows the suite’s mailboxes, numbered in a strange way.',
    alt: 'Projected photograph of mailboxes labelled 1, 10, 11, 100.',
    overlay: { text: 'R = 1   R·L = 10   R·R = 11   R·L·L = 100 ...', position: 'bottom-left', style: 'projected' }, placeholderScene: 'projection',
  },
  {
    id: 'sticky', path: 'assets/photos/sticky.png', title: 'Sticky note',
    caption: 'J’s handwriting, slightly smudged.',
    alt: 'Sticky note reading: Nobody lives at address zero.',
    overlay: { text: 'Nobody lives at address zero.', position: 'center', style: 'ink' }, placeholderScene: 'sticky',
  },
];

export const photoById = (id: string) => PHOTOS.find((p) => p.id === id);
