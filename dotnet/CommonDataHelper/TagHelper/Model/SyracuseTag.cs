using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.TagHelper.Model;

namespace CommonDataHelper.SyracuseTagHelper.Model
{
    public class SyracuseTag
    {
        [JsonProperty("$value")]
        public String description;

        [JsonProperty("category")]
        public SyracuseCategory category;
    }
}
