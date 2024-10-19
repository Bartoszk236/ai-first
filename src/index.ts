import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs"
import { mkdir } from 'fs';
import * as path from 'path';
// za pomocą metody promise.all spróbuj zrobić funkcję, która wykona np. 10 zapytań na raz

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
    const startTime: number = Date.now();
    const directoryPath = `src/requests`;
    await createDirectory();
    let rejectFile = 0;
    let acceptFile = 0;
    const maxConcurrent: number = 20;

    const queue = new VoidQueue(maxConcurrent)

    try {
        const files = await fs.promises.readdir(directoryPath);

        const tasks = files.map((file, index) => {
            const filePath = path.join(directoryPath, file);

            return queue.add(async () => {
                if (path.extname(file) === '.txt') {
                    const fileString = await fs.promises.readFile(filePath, "utf8") as string;
                    const characterCount = fileString.length;

                    if (characterCount < 1000) {
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
            });
        });

        await Promise.all(tasks);

        // console.log(`Pliki zaakceptowane: ${acceptFile}`);
        // console.log(`Pliki odrzucone: ${rejectFile}`);

        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        // console.log(`Operacja zajęła ${timeTaken} sekund.`);

        const averageTime = timeTaken / acceptFile;
        if (acceptFile === 0) {
            // console.log(`Średni czas wykonania poprawnej operacji to: brak poprawnych operacji`);
        } else {
            // console.log(`Średni czas wykonania poprawnej operacji to: ${averageTime}`);
        }
        const data = {
            Pliki_zaakceptowane: acceptFile,
            Pliki_odrzucone: rejectFile,
            Czas_opercaji: timeTaken,
            Średni_czas_opercaji: averageTime,
        }
        createJsonFile(data);
    } catch (err) {
        console.error('Wystąpił błąd przy odczytywaniu folderu:', err);
    }
}

class VoidQueue {
    private tasks: (() => Promise<void>) [] = []
    private running: number = 0;
    private maxConcurrent: number;

    constructor(maxConcurrent: number) {
        this.maxConcurrent = maxConcurrent;
    }

    async add(task: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tasks.push(async () => {
                try {
                    await task();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            this.run();
        });
    }

    private async run(): Promise<void> {
        if (this.running >= this.maxConcurrent || this.tasks.length === 0) {
            return;
        }
        const task = this.tasks.shift();
        if (task) {
            this.running++;
            await task();
            this.running--
            this.run();
        }
    }
}

async function createJsonFile(data: object) {
    const filePath = 'src/data.json';

    try {
        const jsonData = JSON.stringify(data, null, 2);

        await fs.writeFile(filePath, jsonData, `utf8`, err => {
            if (!err) {
                return;
            }
            console.error(err);
        });
    } catch (error) {
        console.error('Błąd podczas zapisywania pliku:', error);
    }
}


main().then(() => console.log(`Done`));