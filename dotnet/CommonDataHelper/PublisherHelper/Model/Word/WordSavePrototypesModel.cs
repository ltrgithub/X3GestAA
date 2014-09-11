using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordSavePrototypesModel
    {
        [JsonProperty("saveNewDocument")]
        public SavePrototypeModel wordSaveNewDocumentPrototype { get; set; }

        [JsonProperty("saveMailMergeTemplate")]
        public SavePrototypeModel wordSaveMailMergeTemplatePrototype { get; set; }

        [JsonProperty("saveReportTemplate")]
        public SavePrototypeModel wordSaveReportTemplatePrototype { get; set; }
    }
}
