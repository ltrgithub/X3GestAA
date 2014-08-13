using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordSavePrototypes
    {
        [JsonProperty("saveNewDocument")]
        public WordSavePrototype wordSaveNewDocumentPrototype;

        [JsonProperty("saveMailMergeTemplate")]
        public WordSavePrototype wordSaveMailMergeTemplatePrototype;

        [JsonProperty("saveReportTemplate")]
        public WordSavePrototype wordSaveReportTemplatePrototype;
    }
}
