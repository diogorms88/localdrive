import ps5sx2 from '../assets/homebrew/ps5sx2.png';

// Homebrew offered on the HomeBrew screen. `filename` is kept as is, so an .elf stays an .elf in the
// downloads folder, ready for the console's ELF loader.
export const HOMEBREW = [
  {
    id: 'ps5sx2',
    name: 'PS5SX2',
    description: 'homebrew.ps5sx2.description',
    cover: ps5sx2,
    url: 'https://github.com/Swordpdf/PS5SX2/releases/download/vk-285-163/ps5sx2-bot.elf',
    filename: 'ps5sx2-bot.elf',
    source: 'github.com/Swordpdf/PS5SX2'
  }
];
