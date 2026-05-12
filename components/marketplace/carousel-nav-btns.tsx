"use client";

export function CarouselNavBtns({ carouselId }: { carouselId: string }) {
  const scroll = (dir: number) => {
    document.getElementById(carouselId)?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };
  return (
    <div className="mk-carousel-nav">
      <button className="mk-carousel-btn" onClick={() => scroll(-1)} aria-label="Trước">←</button>
      <button className="mk-carousel-btn" onClick={() => scroll(1)} aria-label="Sau">→</button>
    </div>
  );
}
