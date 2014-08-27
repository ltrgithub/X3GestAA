using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordDocumentPrototypesModel
    {
        [JsonProperty("$links")]
        public WordSavePrototypesModel links;
    }
}
