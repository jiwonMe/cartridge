// Local shadcn/ui-style source components (Radix Slot + CVA + Tailwind).
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4', {
  variants: { variant: { default: 'bg-primary text-primary-foreground hover:opacity-90', outline: 'border border-input bg-background hover:bg-muted', ghost: 'hover:bg-muted' } }, defaultVariants: { variant: 'default' },
});
export function Button({ className, variant, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props}/>;
}
export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn('flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className)} {...props}/>;
}
export function Label(props: React.ComponentProps<'label'>) { return <label className="text-sm font-medium" {...props}/>; }
export function Card({ className, ...props }: React.ComponentProps<'section'>) { return <section className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props}/>; }
export function Alert({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  return <div role={destructive ? 'alert' : 'status'} className={cn('rounded-md border p-3 text-sm break-words', destructive ? 'border-destructive/30 text-destructive bg-destructive/5' : 'bg-muted')}>{children}</div>;
}
