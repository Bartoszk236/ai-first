import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs"
import { mkdir } from 'fs';
import * as path from 'path';

dotenv.config(); // Load environment variables

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Use the API key from the .env file
    // project: process.env.PROJECT_ID,
});

const systemPrompt: string = `Jesteś odgadywaczem kontekstu tekstu. Twoim zadaniem jest powiedzieć na podstawie tekstu, o czym jest.`

async function summariseText (text: string) {
    try {
        const response =  await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: `Powiedz mi o czym jest ten tekst: ${text}`}],
        });
        const message = response.choices[0].message.content;
        if(!message){
            throw new Error("No response")
        }
        return message;
    }
    catch (error) {
        throw new Error("Error in openAI Response");
    }
}

async function createDirectory(){
    mkdir('responses', { recursive: true }, (err) => {
        if (err) {
            console.error('Błąd przy tworzeniu katalogu:', err);
        } else {
            console.log('Katalog został pomyślnie utworzony.');
        }
    });
}

async function main() {
    const directoryPath = `src/requests`;
    await createDirectory();
    try {
        const files = await fs.promises.readdir(directoryPath);

        for (const file of files) {

            const filePath = path.join(directoryPath, file);

            if (path.extname(file) === '.txt') {
                const fileString = await fs.promises.readFile(`${filePath}`, "utf8");
                const response = await summariseText(fileString);

                const baseName = path.basename(file, '.txt');
                await fs.promises.writeFile(`responses/${baseName}_summary.txt`, response, "utf8");
            }
        }
    } catch (err) {
        console.error('Wystąpił błąd przy odczytywaniu folderu:', err);
    }
}

main().then(() => console.log("Done"));