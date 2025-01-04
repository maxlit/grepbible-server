# grepbible-server

grepbible-server is a server on top of [grepbible](https://github.com/maxlit/grepbible) CLI tool.

You are encouraged to use this project as a foundation or inspiration for crafting your own unique web UI built upon `grepbible` CLI tool. Whether you're looking to implement advanced features, integrate with other services, or simply experiment with new design concepts, this project is designed to be easily forkable and modifiable to suit your creative vision. Thus, although it's functional, it has rudimentary UI design on purpose, to make it easy to fork and build the design from scratch.

# Demo 

![demo](./demo/240404_gbib_demo.gif)

The endpoint is available at [langtools.io/gb](https://langtools.io/gb) to try.
Here are some direct links on example endpoint (all of the could be navigated to also directly from the UI):
- look up a Bible citation - "1 Thessalonians 5:21": [http://langtools.io/gb/q/kj/1%20Thessalonians/5/21](http://langtools.io/gb/q/kj/1%20Thessalonians/5/21)
- ... in a few languages (English, German and Latin in the examples): [http://langtools.io/gb/q/kj,de,vg/1%20Thessalonians/5/21](http://langtools.io/gb/q/kj,de,vg/1%20Thessalonians/5/21)
- look up a range of verses: [http://langtools.io/gb/q/kj/Genesis/41/29-30](http://langtools.io/gb/q/kj/Genesis/41/29-30)
- ... in a few languages: [http://langtools.io/gb/q/kj,de,vg/Genesis/41/29-30](http://langtools.io/gb/q/kj,de,vg/Genesis/41/29-30)
- ... ... in parallel lines: [http://langtools.io/gb/q/kj,de,vg/Genesis/41/29-30?parallel=true](http://langtools.io/gb/q/kj,de,vg/Genesis/41/29-30?parallel=true)
- look up the whole chapter: [http://langtools.io/gb/q/kj/Psalms/117/](http://langtools.io/gb/q/kj/Psalms/117/)
- ... in a few languages: [http://langtools.io/gb/q/kj,de,vg/Psalms/117/](http://langtools.io/gb/q/kj,de,vg/Psalms/117/)
- random quote: [langtools.io/gb/random](https://langtools.io/gb/random)
- ... in a few languages: [langtools.io/gb/random/kj,de,vg](https://langtools.io/gb/random/kj,de,vg)
- look for a specific word ('molten' in KJV): [http://langtools.io/gb/f/kj/molten](http://langtools.io/gb/f/kj/molten)

## Features

- **Full-text search**: Search for words or phrases in the whole text (`grep` experience).
- **Search Capabilities**: Look up individual verses, ranges of chapters, or specific passages across multiple translations.
- **Multiple Bible Versions**: Easily switch between different Bible translations to compare interpretations and wording.
- **Local Caching**: Bible versions are downloaded and stored locally for quick access and offline use.
- **Parallel and interleave text**: Combine text blocks from different translations.

## Self-hosting

Clone the project locally, and then run
`docker compose up .`

Alternatively, you can pull the docker's image (here on port 4628):

`docker pull axlit/grepbible-server`

and run it 

`docker run -d -p 4628:4628 --name grepbible-server axlit/grepbible-server:latest`

## Run locally (installation)

To run `grepbible-server` locally without docker (covered in [Self-hosting](#self-hosting)), you need to:  
1. install `grepbible` CLI tool first, `pip install grepbible` should do it, consult [this page](https://github.com/maxlit/grepbible?tab=readme-ov-file#installation)  for more details.  
2a. install the nodeJS server app: `npm install grepbible-server`
2b. (alternatively), you can clone this project with `git clone`, and run `npm start`.

## Contributing

Contributions to `grepbible-server` are welcome! Whether it's reporting issues, or improving code, or spreading the word, or financial support, your input is valuable.  

### Issues/bugs

To raise an issue, go to 'Issues' tab, and click on 'New issue'.

### Code

To contribute code:

1. Fork the repository.
2. Create a new branch for your feature or fix.
3. Commit your changes with clear, descriptive messages.
4. Push your branch and submit a pull request.

Please ensure your code adheres to the project's style and quality standards. For major changes, please open an issue first to discuss what you would like to change.

### Social

Feel free to spread the word or/and use the hashtag `#grepbible` in social media.

### Material

Feel free to buy me a coffee: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J1VEX6J)

## License

`grepbible-server` is open-source software licensed under the MIT License. See the LICENSE file for more details.