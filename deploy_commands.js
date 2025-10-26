import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { config } from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Memuat variabel lingkungan (Environment Variables)
config();

const commands = [];
// Menggunakan readdirSync dari 'fs' yang diimpor di atas
const commandFiles = readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  // Menggunakan require khusus yang telah dibuat untuk membaca file command
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Token dan ID diakses dari process.env setelah config() dipanggil
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🚀 Deploying slash commands...');

    // Pastikan variabel lingkungan CLIENT_ID dan GUILD_ID sudah terisi di file .env
    const data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });

    console.log(`✅ Slash commands deployed successfully! Total: ${data.length} commands.`);
  } catch (error) {
    console.error('❌ Error during command deployment:', error);
  }
})();
