import { SlashCommandBuilder } from 'discord.js';

// Pastikan menggunakan 'export const'
export const data = new SlashCommandBuilder()
  .setName('ping') // Ganti nama!
  .setDescription('Membalas dengan Pong dan latency bot.');

export async function execute(interaction) {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
  interaction.editReply(`Pong! 🏓 Latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
}
