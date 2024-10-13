import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs"

dotenv.config(); // Load environment variables

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Use the API key from the .env file
    // project: process.env.PROJECT_ID,
});

const systemPrompt: string = `Jesteś odgadywaczem kontekstu tekstu. Twoim zadaniem jest powiedzieć na podstawie tekstu, o czym jest.`

async function  summariseText (text: string) {
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

const main = async () => {
    const file = await fs.promises.readFile("src/request.txt", "utf8");
    const response = await summariseText(file);
    await fs.promises.writeFile("response.txt", response, "utf8");
}

main().then(() => console.log("Done"));



