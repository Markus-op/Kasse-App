from pathlib import Path
import struct, zlib, math
root = Path(__file__).resolve().parents[1] / 'public'
library = root.parent / 'Bilder'
shapes = {
'nachos': '''<path d="M35 107 48 171Q100 190 152 171L165 107Z" fill="#e1a46a"/><path d="m43 111 36-69 36 69Z" fill="#f7ca54" stroke="#dc9e32" stroke-width="4" stroke-linejoin="round"/><path d="m88 111 35-71 36 71Z" fill="#ffdb6d" stroke="#dc9e32" stroke-width="4" stroke-linejoin="round"/><path d="m65 121 33-63 36 63Z" fill="#ffd269" stroke="#dc9e32" stroke-width="4" stroke-linejoin="round"/><circle cx="79" cy="90" r="3" fill="#d99a32"/><circle cx="125" cy="85" r="3" fill="#d99a32"/><path d="M28 116Q100 138 172 116L159 167Q101 190 41 167Z" fill="#d77e51"/><path d="M48 139q54 18 105 0" fill="none" stroke="#efb481" stroke-width="5" stroke-linecap="round"/>''',
'popcorn': '''<path d="M48 83h104l-13 94q-39 14-78 0Z" fill="#f9f2da"/><path d="m53 91 17 2 8 88-16-4Zm39 5h17l-1 90H93Zm38-3 17-2-9 86-16 4Z" fill="#d56c59"/><g fill="#fff7dd" stroke="#e5c97e" stroke-width="3"><path d="M48 99q-19-18-2-29-6-22 15-23 4-21 23-12 16-24 33-7 24-9 28 15 24 0 19 23 17 14-1 30Z"/><circle cx="66" cy="68" r="15"/><circle cx="99" cy="53" r="17"/><circle cx="130" cy="73" r="17"/><circle cx="92" cy="87" r="18"/></g>''',
'snack': '''<ellipse cx="100" cy="40" rx="38" ry="12" fill="#e4b77a"/><path d="M62 40v126q38 25 76 0V40" fill="#d99c49"/><ellipse cx="100" cy="40" rx="38" ry="12" fill="#e4c188" stroke="#c48a47" stroke-width="3"/><path d="M62 77q38 20 76 0v64q-38 21-76 0Z" fill="#f9e5b4"/><ellipse cx="100" cy="112" rx="25" ry="14" transform="rotate(-20 100 112)" fill="#edbc58" stroke="#ce9634" stroke-width="3"/><path d="m80 113 31-10M86 120l31-10" stroke="#d9a345" stroke-width="2"/><ellipse cx="100" cy="167" rx="37" ry="11" fill="#c18b42"/>''',
'getraenk': '''<path d="m116 31 8-16h23" fill="none" stroke="#71938b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="m62 61 13 113q25 15 50 0l13-113Z" fill="#dba860"/><path d="m65 85 10 89q25 15 50 0l10-89" fill="#c88846"/><ellipse cx="100" cy="62" rx="38" ry="10" fill="#f0d39b" stroke="#bf945c" stroke-width="3"/><path d="m118 32-13 77" stroke="#71938b" stroke-width="7"/><rect x="78" y="91" width="21" height="21" rx="5" transform="rotate(-10 78 91)" fill="#f3d8a5" opacity=".8"/><rect x="106" y="108" width="18" height="18" rx="4" transform="rotate(12 106 108)" fill="#f3d8a5" opacity=".8"/><path d="m62 62 13 112q25 15 50 0l13-112" fill="none" stroke="#ba874f" stroke-width="3"/>''',
'eintritt': '''<path d="m39 49 13-5 12 7 13-6 13 7 13-6 13 5 13-6 14 6 14-5v111l-14-6-14 7-13-5-13 7-13-6-13 5-13-6-12 6-13-5Z" fill="#fffef9" stroke="#cbc6b9" stroke-width="3" stroke-linejoin="round"/><path d="M53 117h91" stroke="#c4bca9" stroke-width="2" stroke-dasharray="5 5"/><path d="m100 64 6 14 15 2-11 11 3 15-13-7-14 7 3-15-11-11 16-2Z" fill="#cfb87e"/><path d="M70 135h60" stroke="#bdb49e" stroke-width="5" stroke-linecap="round"/>''',
'clubkarte': '''<path d="m39 49 13-5 12 7 13-6 13 7 13-6 13 5 13-6 14 6 14-5v111l-14-6-14 7-13-5-13 7-13-6-13 5-13-6-12 6-13-5Z" fill="#c75552" stroke="#ab4545" stroke-width="3" stroke-linejoin="round"/><path d="M53 117h91" stroke="#efb5a2" stroke-width="2" stroke-dasharray="5 5"/><path d="m72 78 15 11 13-24 13 24 15-11-6 27H78Z" fill="#f6d7a3"/><path d="M70 135h60" stroke="#f1c2a4" stroke-width="5" stroke-linecap="round"/>'''
}
shapes['bundle'] = '<g transform="translate(-15 14) scale(.82)">' + shapes['snack'] + '</g><g transform="translate(61 25) scale(.77)">' + shapes['getraenk'] + '</g>'
for name, shape in shapes.items():
    (library/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 210"><ellipse cx="100" cy="188" rx="58" ry="7" fill="#394a3d" opacity=".07"/>{shape}</svg>')
(library/'Liste.md').write_text('\n'.join('- '+ name + '.svg' for name in ['nachos','popcorn','snack','getraenk','bundle','eintritt','clubkarte'])+'\n')
(root/'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="#244f46"/><rect x="138" y="100" width="236" height="312" rx="35" fill="#faf6e9"/><rect x="173" y="146" width="166" height="67" rx="13" fill="#95b7a5"/><g fill="#244f46"><rect x="173" y="248" width="40" height="38" rx="10"/><rect x="236" y="248" width="40" height="38" rx="10"/><rect x="299" y="248" width="40" height="38" rx="10"/><rect x="173" y="313" width="40" height="38" rx="10"/><rect x="236" y="313" width="40" height="38" rx="10"/></g><rect x="299" y="313" width="40" height="38" rx="10" fill="#d99c49"/></svg>''')
def png(size):
    data = bytearray()
    for y in range(size):
        data.append(0)
        for x in range(size):
            a,b = x/size*512, y/size*512
            c = (36,79,70)
            if 138 <= a <= 374 and 100 <= b <= 412: c=(250,246,233)
            if 173 <= a <= 339 and 146 <= b <= 213: c=(149,183,165)
            for left in (173,236,299):
                for top in (248,313):
                    if left<=a<=left+40 and top<=b<=top+38: c=(217,156,73) if left==299 and top==313 else (36,79,70)
            data.extend(c)
    def chunk(t,d): return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(data))+chunk(b'IEND',b'')
for size in (192,512): (root/f'icon-{size}.png').write_bytes(png(size))
