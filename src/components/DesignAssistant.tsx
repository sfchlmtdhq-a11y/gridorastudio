import { useEffect, useRef, useState } from 'react';
import { PencilRuler, X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
export type AssistantMessage = { role: 'user' | 'assistant'; text: string; error?: boolean };
export function DesignAssistant({messages,busy,onClose,onSend,onUndo,canUndo}: {messages:AssistantMessage[];busy:boolean;onClose:()=>void;onSend:(text:string)=>Promise<void>;onUndo:()=>void;canUndo:boolean}) {
 const [text,setText]=useState(''); const input=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!busy)input.current?.focus();},[busy]);
 return <section aria-label="AI Design Assistant" className="fixed inset-x-2 bottom-16 z-50 flex h-[min(52dvh,32rem)] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl md:static md:h-auto md:w-[360px] md:shrink-0 md:rounded-none md:border-y-0 md:border-r-0 md:pb-16">
 <div className="flex shrink-0 items-center gap-2 border-b border-border p-3"><PencilRuler className="size-5 text-primary"/><h2 className="min-w-0 flex-1 font-display font-bold">Gridora AI Assistant</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant"><X/></Button></div>
 <Conversation className="min-h-0 flex-1"><ConversationContent className="gap-4 p-3">{!messages.length&&<p className="text-sm text-muted-foreground">Hi! I can edit your design directly. Tell me what to add, change or arrange.</p>}{messages.map((m,i)=><Message key={i} from={m.role}><MessageContent className={m.role==='user'?'bg-primary text-primary-foreground':m.error?'text-destructive bg-transparent':'bg-transparent'}><div role={m.error?'alert':undefined}><MessageResponse>{m.text}</MessageResponse></div></MessageContent></Message>)}{busy&&<p role="status" className="animate-pulse text-sm text-muted-foreground">Working on your design…</p>}</ConversationContent><ConversationScrollButton/></Conversation>
 <div className="shrink-0 border-t border-border p-3"><Button variant="ghost" size="sm" className="mb-2" disabled={!canUndo||busy} onClick={onUndo}><Undo2/>Undo Last Change</Button><PromptInput onSubmit={async()=>{if(!text.trim()||busy)return;const prompt=text;setText('');await onSend(prompt);}}><PromptInputTextarea ref={input} aria-label="Ask the design assistant" placeholder="What would you like to change?" value={text} onChange={e=>setText(e.target.value)} disabled={busy} className="min-h-20"/><PromptInputFooter className="justify-end"><PromptInputSubmit aria-label="Send" status={busy?'submitted':'ready'} disabled={busy||!text.trim()} className="size-10"/></PromptInputFooter></PromptInput></div></section>;
}
