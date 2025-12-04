"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PokeballIcon } from '../icons/PokeballIcon';

const navItems = [
  { href: '/tasks', icon: ListChecks, label: 'Tasks' },
  { href: '/', icon: PokeballIcon, label: 'Home' },
  { href: '/achievements', icon: Trophy, label: 'Achievements' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t-4 border-foreground flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link href={item.href} key={item.label} className="flex flex-col items-center justify-center gap-1 text-foreground hover:text-primary transition-colors">
            <Icon
              className={cn(
                'w-8 h-8',
                isActive ? 'text-primary' : 'text-muted-foreground',
                item.label === 'Home' && 'w-10 h-10'
              )}
            />
            <span className={cn('text-xs font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
