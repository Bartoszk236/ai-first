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
    const startTime = Date.now();
    const directoryPath = `src/requests`;
    await createDirectory();
    let rejectFile = 0;
    let acceptFile = 0;
    try {
        const files = await fs.promises.readdir(directoryPath);

        for (const file of files) {

            const filePath = path.join(directoryPath, file);


            if (path.extname(file) === '.txt') {
                const fileString = await fs.promises.readFile(`${filePath}`, "utf8");
                const characterCount = fileString.length;
                if (characterCount < 1000){
                    const response = await summariseText(fileString);

                    const baseName = path.basename(file, '.txt');
                    await fs.promises.writeFile(`responses/${baseName}_summary.txt`, response, "utf8");
                    acceptFile++;
                } else {
                    console.error(`Za długi plik: ${file}`);
                    rejectFile++;
                }

            } else {
                console.error(`Złe rozszerzenie pliku: ${file}`);
                rejectFile++;

            }
        }
        console.log(`Pliki zaakceptowane: ${acceptFile}`)
        console.log(`Pliki odrzucone: ${rejectFile}`)
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        console.log(`Operacja zajęła ${timeTaken} sekund.`);
        const averageTime = timeTaken / acceptFile
        if (acceptFile === 0){
            console.log(`Średni czas wykonania poprawnej operacji to: brak poprawnych opercaji`)
        } else {
            console.log(`Średni czas wykonania poprawnej operacji to: ${averageTime}`)
        }
    } catch (err) {
        console.error('Wystąpił błąd przy odczytywaniu folderu:', err);
    }
}

main().then(() => console.log(`Done`));