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
        public WordSavePrototypeModel wordSaveNewDocumentPrototype { get; set; }

        [JsonProperty("saveMailMergeTemplate")]
        public WordSavePrototypeModel wordSaveMailMergeTemplatePrototype { get; set; }

        [JsonProperty("saveReportTemplate")]
        public WordSavePrototypeModel wordSaveReportTemplatePrototype { get; set; }
    }
}
