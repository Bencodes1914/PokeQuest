import type { Rival } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { RivalCard } from './RivalCard';

interface RivalsCarouselProps {
  rivals: Rival[];
}

export function RivalsCarousel({ rivals }: RivalsCarouselProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold font-headline mb-4 text-center">Your Rivals</h2>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full max-w-xs mx-auto"
      >
        <CarouselContent>
          {rivals.map((rival) => (
            <CarouselItem key={rival.id}>
              <RivalCard rival={rival} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="text-foreground border-foreground hover:bg-primary" />
        <CarouselNext className="text-foreground border-foreground hover:bg-primary" />
      </Carousel>
    </div>
  );
}
