import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Collection } from 'discord.js'; // Hapus
import { fileURLToPath } from 'url';

dotenv.config();

// setp path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages, // Penting untuk DM reminder
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  import(new URL(`file:///${filePath}`))
    .then((commandModule) => {
      if (commandModule.data && commandModule.execute) {
        client.commands.set(commandModule.data.name, commandModule);
      } else {
        console.warn(`[WARNING] Command di ${filePath} hilang properti 'data' atau 'execute'.`);
      }
    })
    .catch((error) => {
      console.error(`[ERROR] Gagal memuat command ${file}:`, error);
    });
}

const tasksFile = path.join(__dirname, 'data', 'tasks.json');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(tasksFile)) fs.writeFileSync(tasksFile, JSON.stringify([]));

const readTasks = () => JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
const writeTasks = (tasks) => fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: 'Perintah tidak ditemukan!', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Error saat menjalankan command:', error);
    const errorMessage = 'Terjadi error internal saat menjalankan perintah.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// remindr tgs h-1
setInterval(() => {
  if (!fs.existsSync(tasksFile)) return;
  const tasks = readTasks();
  const now = new Date();

  tasks.forEach((task) => {
    const deadline = new Date(task.deadline);
    const diff = (deadline - now) / (1000 * 60 * 60 * 24); // beda hari
    if (diff > 0 && diff < 1) {
      const user = client.users.cache.get(task.userId);
      if (user) {
        user.send(`⏰ **Reminder!**
Tugas **${task.nama}** akan dikumpulin BESOK (${task.deadline})!
Ayo selesaikan biar gak mepet 😬`);
      }
    }
  });
}, 60 * 60 * 1000); // tiap 1 jam

// rmndir jadwla harian
function getSchedule(day) {
  try {
    const data = JSON.parse(fs.readFileSync('jadwal.json', 'utf8'));
    return data[day] || [];
  } catch (err) {
    console.error('❌ Gagal membaca jadwal.json:', err.message);
    return [];
  }
}

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} is online!`);

  cron.schedule('0 6 * * 1-5', () => {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) return console.error('⚠️ Channel tidak ditemukan!');
    const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const today = days[new Date().getDay()];
    const schedule = getSchedule(today);

    if (schedule.length > 0) {
      let msg = `📅 **Jadwal Hari Ini (${today.toUpperCase()})**\n`;
      schedule.forEach((item) => (msg += `- ${item}\n`));
      channel.send(msg);
    } else {
      channel.send(`📅 Hari ini (${today}) LIBURRR 🎉`);
    }
  });
});

// chitchat
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  const msg = message.content.toLowerCase();

  const responses = [
    { keyword: 'pagi bot', reply: 'Pagi jugaa ☀️ semangat belajarnya yaa!' },
    { keyword: 'halo bot', reply: 'Halo jugaa 😎 ada yang bisa kubantu?' },
    { keyword: 'kamu kok baik banget', reply: 'Elehhh, boong kamu tuu, lain kali jangan boong lagi ya.' },
    { keyword: 'bot ganteng', reply: 'Hehehe makasih 😳 kamu juga cakep kok 😎' },
    { keyword: 'bot cantik', reply: 'Hehehe maaciii 😳 kamu juga cantik koo 😎' },
    { keyword: 'malam bot', reply: 'Selamat malam 🌙 jangan lupa istirahat yaa' },
    { keyword: 'tugas apa?', reply: '/tugas list aja bro biar kamu tau detailnya 😆' },
    { keyword: 'ada tugas?', reply: 'Cobaa kamu /tugas list dehh, nanti kamu bakal tau ada tugas tidak 😆' },
    { keyword: 'makasih ya', reply: 'Samaaa-sama, semangatt terus yah kamu 😁' },
    { keyword: 'mksh y', reply: 'Samaaa-sama, semangatt terus yah kamu 😁' },
    { keyword: 'bot', reply: 'Ya, aku di sini! 😁' },
  ];

  for (const r of responses) {
    if (msg.includes(r.keyword)) {
      message.reply(r.reply);
      break;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
