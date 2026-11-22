/** Original pixel cat (sitting, facing you). Used for the title split-state art and the ending. */
export function CatShape({ fur = '#8a93ad', light = '#f1ead8', blink = false, details = true }: { fur?: string; light?: string; blink?: boolean; details?: boolean }) {
  return (
    <g>
      {/* tail */}
      <rect x="23" y="20" width="3" height="6" fill={fur} />
      <rect x="25" y="16" width="3" height="5" fill={fur} />
      <rect x="27" y="13" width="2" height="4" fill={fur} />
      {/* body */}
      <rect x="10" y="15" width="12" height="11" fill={fur} />
      <rect x="9" y="18" width="14" height="8" fill={fur} />
      {details && <rect x="13" y="17" width="6" height="9" fill={light} />}
      <rect x="10" y="25" width="4" height="2" fill={details ? light : fur} />
      <rect x="18" y="25" width="4" height="2" fill={details ? light : fur} />
      {/* head */}
      <path d="M8 1 L12 5 L20 5 L24 1 L24 6 L25 7 L25 13 L23 15 L9 15 L7 13 L7 7 L8 6 Z" fill={fur} />
      {details && (
        <>
          <path d="M9 3 L11 5 L9 5 Z" fill="#e46b8f" />
          <path d="M23 3 L21 5 L23 5 Z" fill="#e46b8f" />
          <rect x="12" y="10" width="8" height="4" fill={light} />
          {blink ? (
            <>
              <rect x="10" y="9" width="3" height="1" fill="#0a0814" />
              <rect x="19" y="9" width="3" height="1" fill="#0a0814" />
            </>
          ) : (
            <>
              <rect x="10" y="7" width="3" height="3" fill="#0a0814" />
              <rect x="19" y="7" width="3" height="3" fill="#0a0814" />
              <rect x="10" y="7" width="1" height="1" fill="#ffffff" />
              <rect x="19" y="7" width="1" height="1" fill="#ffffff" />
              <rect x="12" y="9" width="1" height="1" fill="#5fd3c4" />
              <rect x="21" y="9" width="1" height="1" fill="#5fd3c4" />
            </>
          )}
          <rect x="15" y="10" width="2" height="1" fill="#e46b8f" />
          <rect x="14" y="12" width="1" height="1" fill="#6b7290" />
          <rect x="17" y="12" width="1" height="1" fill="#6b7290" />
          <rect x="15" y="11" width="2" height="1" fill="#6b7290" />
          <path d="M3 10 H9 M3 12.5 H9 M23 10 H29 M23 12.5 H29" stroke="#cfc6b0" strokeWidth="0.5" />
        </>
      )}
    </g>
  );
}
