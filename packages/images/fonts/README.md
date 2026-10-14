# Bundled fonts

The built-in Open Graph card (`../templates/og.eta`) uses these fonts. Satori, which lays out
the card, reads TTF, OTF and WOFF but not WOFF2, and it ignores variable font axes, so each
file is a static instance of a variable font, cut down to the characters a card needs.

| File | Family and weight | Source | Licence |
|---|---|---|---|
| `archivo-extrabold-expanded.woff` | Archivo 800, width 112 | [Archivo](https://github.com/Omnibus-Type/Archivo) | `OFL-Archivo.txt` |
| `inter-regular.woff` | Inter 400 (optical size 32) | [Inter](https://github.com/rsms/inter) | `OFL-Inter.txt` |
| `inter-medium.woff` | Inter 500 (optical size 32) | [Inter](https://github.com/rsms/inter) | `OFL-Inter.txt` |
| `fira-code-regular.woff` | Fira Code 400 | [Fira Code](https://github.com/tonsky/FiraCode) | `OFL-FiraCode.txt` |

All four are licensed under the SIL Open Font License 1.1.

## Character coverage

Basic Latin, Latin-1 Supplement and Latin Extended-A (U+0020-017F), general punctuation
(U+2000-206F, including curly quotes and dashes), the euro sign, the trademark sign and
arrows. Titles in other scripts need their own fonts: add them with `images.og.fonts` and use
them from a custom `og.eta`.

## Rebuilding

The variable sources come from [google/fonts](https://github.com/google/fonts) (`ofl/archivo`,
`ofl/inter`, `ofl/firacode`). With [fontTools](https://github.com/fonttools/fonttools)
installed (`pip install fonttools`), each file is an instance plus a subset:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

UNICODES = (
    "U+0020-007E,U+00A0-017F,U+0192,U+02C6,U+02DA,U+02DC,"
    "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212"
)

def build(source, axes, output):
    font = TTFont(source)
    if axes:
        font = instantiateVariableFont(font, axes)
    options = subset.Options()
    options.flavor = "woff"
    options.hinting = False
    options.desubroutinize = True
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)
    font.flavor = "woff"
    font.save(output)

build("Archivo[wdth,wght].ttf", {"wght": 800, "wdth": 112}, "archivo-extrabold-expanded.woff")
build("Inter[opsz,wght].ttf", {"wght": 400, "opsz": 32}, "inter-regular.woff")
build("Inter[opsz,wght].ttf", {"wght": 500, "opsz": 32}, "inter-medium.woff")
build("FiraCode[wght].ttf", {"wght": 400}, "fira-code-regular.woff")
```

The `og/fonts` folders of the blog and docs starters in `examples/` were built the same way:
Young Serif 400 for the blog (`ofl/youngserif`), Inter 600 and 800 for docs.
