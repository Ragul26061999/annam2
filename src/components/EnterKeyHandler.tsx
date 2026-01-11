'use client';

import { useEffect } from 'react';

/**
 * Global handler to convert Enter key press to Tab key behavior for form inputs.
 * This applies to the entire project but skips buttons and specific input types.
 */
export default function EnterKeyHandler() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only process Enter key
            if (e.key !== 'Enter') return;

            const activeElement = document.activeElement as HTMLElement;
            if (!activeElement) return;

            // Check if this is a case sheet textarea - if so, let Enter work naturally for new lines
            if (activeElement.tagName === 'TEXTAREA' && activeElement.hasAttribute('data-field-index')) {
                // This is a case sheet textarea, don't intercept Enter - let it create new lines
                return;
            }

            // Identify if current element is a form input that should transition to next field
            // We target common text-based inputs and selects
            const isInput = activeElement.tagName === 'INPUT' &&
                !['button', 'submit', 'reset', 'checkbox', 'radio', 'file'].includes((activeElement as HTMLInputElement).type);
            const isSelect = activeElement.tagName === 'SELECT';
            const isTextarea = activeElement.tagName === 'TEXTAREA';

            // Special case for textarea: Enter moves to next field, Shift+Enter adds new line
            // (but NOT for case sheet textareas which are handled above)
            const shouldMoveFocus = isInput || isSelect || (isTextarea && !e.shiftKey);

            if (shouldMoveFocus) {
                // Prevent default browser behavior (form submission or newline in textarea)
                e.preventDefault();

                // Standard focusable element selector
                const focusableSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

                // Scope the search to the nearest container to avoid jumping across unrelated UI parts
                // Prefer current Form or Modal, otherwise search entire document
                const container = activeElement.closest('form') ||
                    activeElement.closest('[role="dialog"]') ||
                    activeElement.closest('.modal-content') ||
                    document;

                const allElements = Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];

                // Filter to only included visible elements
                const focusableElements = allElements.filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
                });

                const currentIndex = focusableElements.indexOf(activeElement);

                if (currentIndex > -1) {
                    const nextIndex = currentIndex + 1;

                    if (nextIndex < focusableElements.length) {
                        const nextElement = focusableElements[nextIndex];
                        nextElement.focus();

                        // If it's an input, select its content for easier editing (common UX for data entry)
                        if (nextElement.tagName === 'INPUT') {
                            (nextElement as HTMLInputElement).select();
                        }
                    } else {
                        // Optional: loop back to first element or do nothing
                        // For now, let's keep focus on the last element or blur? 
                        // Usually, stopping at the last element (likely a submit button) is best.
                    }
                }
            }
        };

        // Attach to document to catch all events
        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase to be safe
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    return null;
}
