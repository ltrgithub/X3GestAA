using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.SyracuseTagHelper.Model
{
    public class SyracuseTag
    {
        [JsonProperty("$value")]
        public String description;

        [JsonProperty("category")]
        public String category;
    }
}
