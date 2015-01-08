using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Common
{
    public class SavePrototypesModel
    {
        [JsonProperty("saveNewDocument")]
        public SavePrototypeModel saveNewDocumentPrototype { get; set; }

        [JsonProperty("saveMailMergeTemplate")]
        public SavePrototypeModel saveMailMergeTemplatePrototype { get; set; }

        [JsonProperty("saveReportTemplate")]
        public SavePrototypeModel saveReportTemplatePrototype { get; set; }
    }
}
