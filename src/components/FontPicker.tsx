import { useState } from "react";
import { Check, Search, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

const FONTS = ["Manrope", "Syne", "Montserrat", "Poppins", "Oswald", "Bebas Neue", "Anton", "Playfair Display", "Roboto Slab", "Lobster", "Pacifico", "Dancing Script", "Permanent Marker", "Arial", "Georgia", "Courier New"];
const TONES = ["bg-font-lime/10 text-font-lime border-font-lime/30", "bg-font-rose/10 text-font-rose border-font-rose/30", "bg-font-aqua/10 text-font-aqua border-font-aqua/30", "bg-font-gold/10 text-font-gold border-font-gold/30"];

export function FontPicker({ value, onChange }: { value: string; onChange: (font: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return <div className="space-y-2">
    <Button variant="outline" className="h-12 w-full justify-between border-primary/40 bg-primary/10" aria-label="Choose font" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="flex items-center gap-2"><Type className="text-primary" /><span style={{ fontFamily: value }}>{value}</span></span>
      <span className="text-xs text-primary">Aa</span>
    </Button>
    {open && <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-md border border-input bg-background px-2"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input aria-label="Search fonts" className="h-9 min-w-0 w-full bg-transparent text-sm outline-none" value={query} placeholder="Search fonts" onChange={e => setQuery(e.target.value)} /></label>
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
        {FONTS.filter(font => font.toLowerCase().includes(query.toLowerCase())).map(font => <Button key={font} variant="ghost" className={`relative h-20 min-w-0 flex-col gap-0.5 border ${TONES[FONTS.indexOf(font) % TONES.length]} ${value === font ? "ring-1 ring-primary" : ""}`} onClick={() => { onChange(font); setOpen(false); }}>
          <span className="text-2xl" style={{ fontFamily: font }}>Ag</span><span className="w-full truncate text-[10px]">{font}</span>{value === font && <Check className="absolute right-1 top-1" />}
        </Button>)}
      </div>
      {FONTS.filter(font => font.toLowerCase().includes(query.toLowerCase())).length === 0 && <p className="text-xs text-muted-foreground">No matching fonts.</p>}
    </div>}
  </div>;
}