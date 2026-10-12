import ps5sx2 from '../assets/homebrew/ps5sx2.png';

// Homebrew offered on the HomeBrew screen. `filename` is kept as is, so an .elf stays an .elf in
// /data/pldmgr/payloads, where Payload Manager lists it.
//
// `bios` lists the BIOS an emulator needs and the folder it reads them from (under the storage
// root, /data on PS5). A region may have a private direct-download `url`; leave it empty to ask
// for a link on the console. Do not commit personal BIOS links to this public source.
export const HOMEBREW = [
  {
    id: 'ps5sx2',
    name: 'PS5SX2',
    description: 'homebrew.ps5sx2.description',
    cover: ps5sx2,
    url: 'https://github.com/Swordpdf/PS5SX2/releases/download/vk-285-163/ps5sx2-bot.elf',
    filename: 'ps5sx2-bot.elf',
    source: 'github.com/Swordpdf/PS5SX2',
    bios: {folder: 'PCSX2/bios', regions: [{id: 'usa', name: 'USA (NTSC-U)', url: 'https://dl.ps2bios-download.com/ps2-bios-usa.zip'}]}
  }
];

export const homebrewById = id => HOMEBREW.find(item => item.id === id);
