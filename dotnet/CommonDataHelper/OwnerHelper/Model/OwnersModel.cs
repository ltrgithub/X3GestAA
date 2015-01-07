using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.OwnerHelper.Model
{
    public class OwnersModel
    {
        [JsonProperty("$resources")]
        public List<OwnerModel> owners { get; set; }
    }
}
