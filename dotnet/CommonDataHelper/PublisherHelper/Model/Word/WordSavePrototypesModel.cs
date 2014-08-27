using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordSavePrototypesModel
    {
        [JsonProperty("saveNewDocument")]
        public WordSavePrototypeModel wordSaveNewDocumentPrototype;

        [JsonProperty("saveMailMergeTemplate")]
        public WordSavePrototypeModel wordSaveMailMergeTemplatePrototype;

        [JsonProperty("saveReportTemplate")]
        public WordSavePrototypeModel wordSaveReportTemplatePrototype;
    }
}
