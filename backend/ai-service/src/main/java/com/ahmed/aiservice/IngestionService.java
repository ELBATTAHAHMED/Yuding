package com.ahmed.aiservice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TextSplitter;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.util.List;

@Component

public class IngestionService  implements CommandLineRunner
{

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    public IngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    private VectorStore vectorStore;

    @Value("classpath:/docs/Hébergements au Maroc.pdf")
    private Resource pdfDoc;

    @Override
    public void run(String... args) throws Exception {

        var pdfReader =  new PagePdfDocumentReader(pdfDoc);

        TextSplitter textSplitter = new TokenTextSplitter();

        List<Document> liste1 = pdfReader.get();


        List<Document> liste2 = textSplitter.apply(liste1);

        log.info("Nonmbre de documents extraits {} ",liste2.size());

        vectorStore.accept(liste2);

        log.info("VectorStore chargé avec les données");


    }
}