import { describe, expect, it } from 'vitest';
import { responseSchema } from './design-actions';

describe('Validated canvas actions', () => {
  it('accepts a multi-step edit on the existing canvas', () => {
    const result = responseSchema.parse({reply:'Apply edits',actions:[
      {type:'setBackground',color:'#000000'},
      {type:'addText',text:'GRAND OPENING',fill:'#ffffff',fontSize:72,fontWeight:'bold'},
      {type:'addShape',shape:'rect',fill:'#ffd700',width:900,height:150},
      {type:'setOrder',direction:'back'},
    ]});
    expect(result.actions).toHaveLength(4);
    expect(result.actions[1]).toMatchObject({text:'GRAND OPENING',fontSize:72});
  });
  it('rejects arbitrary executable code', () => {
    expect(responseSchema.safeParse({reply:'Edit',actions:[{type:'executeJavaScript',code:'alert(1)'}]}).success).toBe(false);
  });
  it('rejects invalid size and color parameters', () => {
    expect(responseSchema.safeParse({reply:'Edit',actions:[{type:'updateSelected',width:-1,fill:'not-a-color'}]}).success).toBe(false);
  });
  it('supports explicit corner placement and object locks', () => {
    expect(responseSchema.parse({reply:'Edit',actions:[{type:'alignSelected',targetIndex:0,alignment:'top-right'},{type:'updateSelected',targetIndex:0,locked:true}]}).actions).toHaveLength(2);
  });
});