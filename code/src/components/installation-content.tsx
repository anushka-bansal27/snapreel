'use client';
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InstallationContent({ htmlContent }: { htmlContent: string }) {
    const contentRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        // Style the buttons to match the site theme
        const copyButtons = container.querySelectorAll('.copy-btn');
        copyButtons.forEach(btn => {
            const button = btn as HTMLButtonElement;
            const originalText = button.textContent;
            button.className = ''; // Clear any inline classes from the HTML
            button.classList.add(...cn(buttonVariants({ variant: 'default', size: 'sm' }), "copy-btn").split(' '));
            button.textContent = originalText;
        });

        // Use event delegation for robust copy functionality
        const handleClick = async (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const btn = target.closest('.copy-btn') as HTMLButtonElement | null;

            if (!btn || btn.textContent === 'Copied!') return; // Prevent multiple clicks

            const targetId = btn.getAttribute('data-copy-target');
            if (!targetId) return;

            const codeEl = container.querySelector(`#${targetId}`);
            if (!codeEl) return;
            
            const text = (codeEl as HTMLElement).innerText;

            try {
                await navigator.clipboard.writeText(text);
                const oldText = btn.textContent;
                btn.textContent = 'Copied!';
                
                toast({ title: 'Copied to clipboard!' });

                setTimeout(() => {
                   btn.textContent = oldText;
                }, 2000);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy to clipboard.' });
            }
        };

        container.addEventListener('click', handleClick);

        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [htmlContent, toast]);

    return <div ref={contentRef} className="prose dark:prose-invert prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
