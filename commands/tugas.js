import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Perbaikan Path: Mendapatkan path absolut ke folder data dari lokasi file ini
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Menentukan path ke tasks.json (Asumsi struktur: commands/tugas.js -> data/tasks.json)
const tasksFile = path.join(__dirname, '..', 'data', 'tasks.json');

// Pastikan file JSON ada
if (!fs.existsSync(tasksFile)) {
  // Pastikan folder 'data' ada jika Anda menggunakan path di atas
  const dataDir = path.dirname(tasksFile);
  if (!fs.existsSync(dataDir)) {
    // Mencegah error jika folder data belum ada
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(tasksFile, JSON.stringify([]));
}
// Fungsi bantu baca/tulis JSON
const readTasks = () => JSON.parse(fs.readFileSync(tasksFile, 'utf8')); // Tambah encoding
const writeTasks = (tasks) => fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8'); // Tambah encoding

// 2. Perubahan Eksport: Menggunakan export const agar kompatibel dengan cara import() dinamis
// (Ini yang paling sering menyebabkan error 'toJSON' saat deploy)
export const data = new SlashCommandBuilder()
  .setName('tugas')
  .setDescription('Kelola daftar tugas dan deadline')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Tambah tugas baru')
      .addStringOption((opt) => opt.setName('nama').setDescription('Nama tugas').setRequired(true))
      .addStringOption((opt) => opt.setName('deadline').setDescription('Deadline (YYYY-MM-DD)').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('Lihat daftar semua tugas'))
  .addSubcommand((sub) =>
    sub
      .setName('hapus')
      .setDescription('Hapus tugas berdasarkan nama')
      .addStringOption((opt) => opt.setName('nama').setDescription('Nama tugas').setRequired(true))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const nama = interaction.options.getString('nama');
  const deadline = interaction.options.getString('deadline');
  let tasks = readTasks();

  if (sub === 'add') {
    // Cek format deadline sederhana
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return interaction.reply({ content: '❌ Format deadline harus **YYYY-MM-DD** (contoh: 2024-12-31).', ephemeral: true });
    }

    tasks.push({ nama, deadline, userId: interaction.user.id, timestamp: Date.now() });
    writeTasks(tasks);
    return interaction.reply(`✅ Tugas **${nama}** berhasil ditambahkan dengan deadline **${deadline}**.`);
  }

  if (sub === 'list') {
    if (tasks.length === 0) return interaction.reply('📭 Belum ada tugas.');

    // Sortir berdasarkan deadline
    const sortedTasks = tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const list = sortedTasks.map((t, index) => `${index + 1}. **${t.nama}** (Deadline: ${t.deadline}) - Ditambahkan oleh: <@${t.userId}>`).join('\n');

    return interaction.reply({ content: `📚 Daftar Tugas:\n${list}`, ephemeral: true });
  }

  if (sub === 'hapus') {
    const initialLength = tasks.length;
    const newTasks = tasks.filter((t) => t.nama.toLowerCase() !== nama.toLowerCase()); // Hapus case-insensitive

    if (newTasks.length === initialLength) {
      return interaction.reply({ content: `🤷 Tugas **${nama}** tidak ditemukan.`, ephemeral: true });
    }

    writeTasks(newTasks);
    return interaction.reply(`🗑️ Tugas **${nama}** berhasil dihapus.`);
  }
}
